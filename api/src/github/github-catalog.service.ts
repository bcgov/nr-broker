import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { isAxiosError } from 'axios';
import { Job } from 'bullmq';
import {
  GITHUB_CATALOG_ORGS,
  GITHUB_MANAGED_URL_REGEX,
  GITHUB_SYNC_CLIENT_ID,
  GITHUB_SYNC_PRIVATE_KEY,
  REDIS_QUEUES,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { BullService } from '../bull/bull.service';
import { CatalogSyncService } from '../graph/sync/catalog-sync.service';
import { GraphService } from '../graph/graph.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import {
  GithubApiOperationError,
  GithubTokenService,
} from './github-token.service';
import { GithubCatalogFileReader } from './github-catalog-file-reader.service';
import { GithubCatalogOrgScanner } from './github-catalog-org-scanner.service';
import type { CatalogRepoScanJob, CatalogScanJob } from './github-catalog.types';

export type {
  CatalogOrgScanJob,
  CatalogRepoScanJob,
  CatalogScanJob,
} from './github-catalog.types';

/**
 * Scans configured GitHub organizations for Backstage `catalog-info.yaml`
 * files at the root of each repository and records the discovered projects,
 * services and repositories in the graph. `Location` entities in the root
 * catalog file are followed one level.
 */
@Injectable()
export class GithubCatalogService implements OnModuleInit {
  constructor(
    private readonly auditService: AuditService,
    private readonly bullService: BullService,
    private readonly catalogSyncService: CatalogSyncService,
    private readonly githubTokenService: GithubTokenService,
    private readonly fileReader: GithubCatalogFileReader,
    private readonly orgScanner: GithubCatalogOrgScanner,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
  ) {}

  public isEnabled(): boolean {
    return (
      GITHUB_CATALOG_ORGS.length > 0 &&
      GITHUB_SYNC_CLIENT_ID !== '' &&
      GITHUB_SYNC_PRIVATE_KEY !== ''
    );
  }

  public isCatalogOrg(org: string): boolean {
    return GITHUB_CATALOG_ORGS.some(
      (configured) => configured.toLowerCase() === org.toLowerCase(),
    );
  }

  public isSyncEnabled(): boolean {
    return GITHUB_SYNC_CLIENT_ID !== '' && GITHUB_SYNC_PRIVATE_KEY !== '';
  }

  onModuleInit(): void {
    if (!this.isSyncEnabled()) {
      return;
    }
    this.bullService.registerWorker(
      REDIS_QUEUES.GITHUB_CATALOG_SCAN,
      async (job: Job) => {
        await this.processJob(job.data as CatalogScanJob | string);
      },
    );
    if (!this.isEnabled()) {
      return;
    }
    this.orgScanner.registerLeaderJob();
  }

  public async enqueueOrgScans(): Promise<void> {
    await this.orgScanner.enqueueOrgScans();
  }

  /**
   * A string job is a repository id queued by collection sync. Otherwise the
   * job is a scan job from the scheduled org scan.
   */
  public async processJob(data: CatalogScanJob | string): Promise<void> {
    try {
      if (typeof data === 'string') {
        await this.processRepositoryId(data);
      } else if (data.type === 'org') {
        await this.orgScanner.scan(data.org);
      } else if (data.type === 'repo') {
        await this.scanRepository(data);
      }
    } catch (failure) {
      // A non-rate-limit 403 is an access denial and retrying will not help.
      const rateLimited =
        failure instanceof GithubApiOperationError
          ? failure.isRateLimited
          : isAxiosError(failure) &&
            (failure.response?.status === 429 ||
              failure.response?.headers?.['retry-after'] !== undefined ||
              failure.response?.headers?.['x-ratelimit-remaining'] === '0' ||
              /rate limit/i.test(
                failure.response?.data?.message ?? failure.message,
              ));
      const denied =
        !rateLimited &&
        (failure instanceof GithubApiOperationError
          ? failure.status === 403
          : isAxiosError(failure) && failure.response?.status === 403);
      this.auditService.recordGitHubCatalogSync(
        'end',
        'failure',
        failure instanceof GithubApiOperationError
          ? failure.message
          : denied
            ? 'GitHub catalog scan failed because GitHub denied access (403). Check that the GitHub app is installed on the repository with read access to its contents.'
            : 'GitHub catalog scan failed',
        {
          ...(typeof data === 'string'
            ? { repositoryId: data }
            : data.type === 'repo'
              ? {
                  organization: data.org,
                  repository: data.repo,
                  repositoryId: data.repositoryId,
                  repositoryUrl: data.htmlUrl,
                }
              : { organization: data.org }),
          failure,
        },
      );
      if (denied) {
        return;
      }
      throw failure;
    }
  }

  /**
   * Queue a scan of one repository. Returns false if the URL is not a
   * Broker-managed GitHub repository URL.
   */
  public async enqueueRepoScan(scmUrl: string): Promise<boolean> {
    const job = this.buildRepoScanJob(scmUrl);
    if (!job) {
      return false;
    }
    if (!this.isCatalogOrg(job.org)) {
      throw new BadRequestException(
        `The organization ${job.org} is not in the configured catalog organizations. Add it to GITHUB_CATALOG_ORGS or use a repository from a configured organization, then retry.`,
      );
    }
    await this.enqueue(job, `repo-${job.org}-${job.repo}`);
    return true;
  }

  private buildRepoScanJob(
    scmUrl: string | undefined,
    repositoryId?: string,
  ): CatalogRepoScanJob | null {
    const match = new RegExp(GITHUB_MANAGED_URL_REGEX).exec(scmUrl ?? '');
    if (!match) {
      return null;
    }
    const [org, repo] = match[1].split('/');
    return { type: 'repo', org, repo, htmlUrl: scmUrl!, repositoryId };
  }

  private async processRepositoryId(repositoryId: string): Promise<void> {
    const repository = await this.collectionRepository.getCollectionById(
      'repository',
      repositoryId,
    );
    const job = this.buildRepoScanJob(repository.scmUrl, repositoryId);
    if (!job) {
      this.auditService.recordGitHubCatalogSync(
        'info',
        'unknown',
        `Skip catalog sync of unmanaged url (${repository.id})`,
        {
          repositoryId: repository.id,
          repositoryUrl: repository.scmUrl,
        },
      );
      return;
    }
    await this.scanRepository(job);
  }

  private async enqueue(data: CatalogScanJob, jobId: string) {
    // Removing finished jobs lets the stable job id dedupe only pending scans
    await this.bullService.enqueue(REDIS_QUEUES.GITHUB_CATALOG_SCAN, data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  private async scanRepository(job: CatalogRepoScanJob): Promise<void> {
    const token = await this.githubTokenService.getOrgInstallationToken(job.org);
    const components = await this.fileReader.collectComponents(job, token);
    await this.catalogSyncService.syncRepository(
      {
        name: job.repo,
        scmUrl: job.htmlUrl,
        description: job.description ?? `${job.org}/${job.repo}`,
      },
      components,
    );

    if (job.repositoryId) {
      // Reload so the status update does not overwrite changes made by the sync
      const repository = await this.collectionRepository.getCollectionById(
        'repository',
        job.repositoryId,
      );
      await this.graphService.updateSyncStatus(
        repository,
        'syncCatalogStatus',
        'syncAt',
      );
    }
  }
}
