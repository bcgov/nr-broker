import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  BULL_LEADER_JOBS,
  GITHUB_CATALOG_LAST_SCAN_KEY_PREFIX,
  GITHUB_CATALOG_ROOT_FILE,
  GITHUB_CATALOG_ORGS,
  GITHUB_CATALOG_SCAN_CRON,
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
import { RedisService } from '../redis/redis.service';
import { GithubService } from './github.service';
import { GithubTokenService } from './github-token.service';
import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity, CatalogEntityType } from '../catalog/catalog-entity';
import { CatalogComponentEntity } from '../catalog/catalog-component.entity';
import { CatalogLocationEntity } from '../catalog/catalog-location.entity';

export interface CatalogOrgScanJob {
  type: 'org';
  org: string;
}

export interface CatalogRepoScanJob {
  type: 'repo';
  org: string;
  repo: string;
  // Omitted to use the default branch of the repository
  defaultBranch?: string;
  htmlUrl: string;
  description?: string;
  // Set when queued by collection sync so the sync status can be recorded
  repositoryId?: string;
}

export type CatalogScanJob = CatalogOrgScanJob | CatalogRepoScanJob;

interface CatalogRepositoryNode {
  name: string;
  url: string;
  description: string | null;
  isArchived: boolean;
  isDisabled: boolean;
  pushedAt: string | null;
  defaultBranchRef: { name: string } | null;
  catalogFile: { __typename: string } | null;
}

interface CatalogRepositoryPage {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: (CatalogRepositoryNode | null)[];
}

const ORG_CATALOG_REPOSITORIES_QUERY = `
  query ($org: String!, $after: String, $expression: String!) {
    organization(login: $org) {
      repositories(
        first: 100
        after: $after
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          url
          description
          isArchived
          isDisabled
          pushedAt
          defaultBranchRef {
            name
          }
          catalogFile: object(expression: $expression) {
            __typename
          }
        }
      }
    }
  }
`;

/**
 * Scans configured GitHub organizations for Backstage `catalog-info.yaml`
 * files at the root of each repository and records the discovered projects,
 * services and repositories in the graph. `Location` entities in the root
 * catalog file are followed one level.
 */
@Injectable()
export class GithubCatalogService implements OnModuleInit {
  private readonly logger = new Logger(GithubCatalogService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly bullService: BullService,
    private readonly catalogSyncService: CatalogSyncService,
    private readonly githubService: GithubService,
    private readonly githubTokenService: GithubTokenService,
    private readonly redisService: RedisService,
    private readonly catalogUtil: CatalogUtil,
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
    this.bullService.registerLeaderJob(
      BULL_LEADER_JOBS.GITHUB_CATALOG_SCAN,
      GITHUB_CATALOG_SCAN_CRON,
      () => this.enqueueOrgScans(),
    );
  }

  public async enqueueOrgScans(): Promise<void> {
    for (const org of GITHUB_CATALOG_ORGS) {
      await this.enqueue({ type: 'org', org }, `org-${org}`);
    }
  }

  /**
   * A string job is a repository id queued by collection sync. Otherwise the
   * job is a scan job from the scheduled org scan.
   */
  public async processJob(data: CatalogScanJob | string): Promise<void> {
    if (typeof data === 'string') {
      await this.processRepositoryId(data);
    } else if (data.type === 'org') {
      await this.scanOrg(data.org);
    } else if (data.type === 'repo') {
      await this.scanRepository(data);
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
      this.auditService.recordToolsSync(
        'info',
        'unknown',
        `Skip catalog sync of unmanaged url (${repository.id})`,
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

  /**
   * Queue a scan for each active repository with a root catalog file that was
   * pushed to since the last successful org scan. Repositories are ordered by
   * push date so paging stops at the first repository older than the last scan.
   */
  private async scanOrg(org: string): Promise<void> {
    const token = await this.githubTokenService.getOrgInstallationToken(org);
    const lastScanKey = `${GITHUB_CATALOG_LAST_SCAN_KEY_PREFIX}${org}`;
    const lastScan = await this.redisService.get(lastScanKey);
    const since = lastScan ? new Date(lastScan).getTime() : 0;
    const scanStartedAt = new Date().toISOString();
    let after: string | null = null;
    let hasNextPage = true;
    let count = 0;

    while (hasNextPage) {
      const page = await this.queryOrgRepositories(org, after, token);
      for (const repo of page.nodes) {
        if (!repo) {
          continue;
        }
        if (!repo.pushedAt || new Date(repo.pushedAt).getTime() < since) {
          hasNextPage = false;
          break;
        }
        if (
          repo.isArchived ||
          repo.isDisabled ||
          !repo.defaultBranchRef ||
          repo.catalogFile?.__typename !== 'Blob'
        ) {
          continue;
        }
        await this.enqueue(
          {
            type: 'repo',
            org,
            repo: repo.name,
            defaultBranch: repo.defaultBranchRef.name,
            htmlUrl: repo.url,
            description: repo.description ?? undefined,
          },
          `repo-${org}-${repo.name}`,
        );
        count++;
      }
      if (hasNextPage) {
        hasNextPage = page.pageInfo.hasNextPage;
        after = page.pageInfo.endCursor;
      }
    }

    await this.redisService.set(lastScanKey, scanStartedAt);

    this.auditService.recordToolsSync(
      'info',
      'success',
      lastScan
        ? `Catalog scan queued ${count} repositories updated since ${lastScan} for ${org}`
        : `Catalog scan queued ${count} repositories for ${org}`,
    );
  }

  private async queryOrgRepositories(
    org: string,
    after: string | null,
    token: string,
  ): Promise<CatalogRepositoryPage> {
    const body = await this.githubService.graphql(
      ORG_CATALOG_REPOSITORIES_QUERY,
      {
        org,
        after,
        expression: `HEAD:${GITHUB_CATALOG_ROOT_FILE}`,
      },
      token,
    );
    // The app may lack contents: read on some repositories. GitHub returns
    // partial data with these fields null for those, so they are skipped.
    const contentFields = ['catalogFile', 'defaultBranchRef'];
    const errors = (
      (body.errors ?? []) as {
        message: string;
        path?: (string | number)[];
      }[]
    ).filter(
      (error) =>
        !contentFields.includes(String(error.path?.[error.path.length - 1])),
    );
    if (errors.length) {
      throw new Error(
        `GitHub GraphQL query failed for ${org}: ${errors
          .map(
            (error) =>
              `${error.message}${error.path ? ` (${error.path.join('.')})` : ''}`,
          )
          .join('; ')}`,
      );
    }
    const repositories = body.data?.organization?.repositories;
    if (!repositories) {
      throw new Error(`GitHub organization not found: ${org}`);
    }
    return repositories;
  }

  private async scanRepository(job: CatalogRepoScanJob): Promise<void> {
    const token = await this.githubTokenService.getOrgInstallationToken(job.org);
    const components = await this.collectComponents(job, token);
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

  /**
   * Read the root catalog file. If it declares `Location` targets, read each
   * target as well. Only the root file may declare a `Location`, so target
   * files are read for components only.
   */
  private async collectComponents(
    job: CatalogRepoScanJob,
    token: string,
  ): Promise<CatalogComponentEntity[]> {
    const rootEntities = await this.readCatalogFile<
      CatalogComponentEntity | CatalogLocationEntity
    >(
      job,
      GITHUB_CATALOG_ROOT_FILE,
      token,
      [CatalogComponentEntity, CatalogLocationEntity],
    );
    if (rootEntities === null) {
      return [];
    }

    const components: CatalogComponentEntity[] = [];
    const locationPaths = new Set<string>();
    for (const entity of rootEntities) {
      if (entity instanceof CatalogComponentEntity) {
        components.push(entity);
      } else if (entity instanceof CatalogLocationEntity) {
        entity.targets.forEach((target) => locationPaths.add(target));
      }
    }
    locationPaths.delete(GITHUB_CATALOG_ROOT_FILE);

    for (const path of locationPaths) {
      const entities = await this.readCatalogFile(job, path, token, [
        CatalogComponentEntity,
      ]);
      if (entities === null) {
        this.logger.warn(
          `Catalog location target not found: ${job.org}/${job.repo}:${path}`,
        );
        continue;
      }
      components.push(...entities);
    }

    return components;
  }

  private async readCatalogFile<T extends CatalogEntity>(
    job: CatalogRepoScanJob,
    path: string,
    token: string,
    types: CatalogEntityType<T>[],
  ): Promise<T[] | null> {
    const content = await this.fetchFile(job, path, token);
    if (content === null) {
      return null;
    }
    return CatalogEntity.parseCatalogEntities(
      path,
      content,
      types,
      this.catalogUtil,
      (error) => this.logger.warn(error.message),
    );
  }

  private async fetchFile(
    job: CatalogRepoScanJob,
    path: string,
    token: string,
  ): Promise<string | null> {
    return this.githubService.getRepoFileContent(
      job.org,
      job.repo,
      path,
      job.defaultBranch,
      token,
    );
  }
}
