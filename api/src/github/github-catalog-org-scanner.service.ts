import { Injectable } from '@nestjs/common';
import {
  BULL_LEADER_JOBS,
  GITHUB_CATALOG_LAST_SCAN_KEY_PREFIX,
  GITHUB_CATALOG_ROOT_FILE,
  GITHUB_CATALOG_ORGS,
  GITHUB_CATALOG_SCAN_CRON,
  REDIS_QUEUES,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { BullService } from '../bull/bull.service';
import { RedisService } from '../redis/redis.service';
import { GithubService } from './github.service';
import { GithubTokenService } from './github-token.service';
import type {
  CatalogOrgScanJob,
  CatalogRepoScanJob,
} from './github-catalog.types';

interface CatalogRepositoryNode {
  name: string;
  url: string;
  description: string | null;
  isArchived: boolean;
  isDisabled: boolean;
  pushedAt: string | null;
  defaultBranchRef: {
    name: string;
    target: {
      branchHistory: { totalCount: number } | null;
    } | null;
  } | null;
  catalogFile: { __typename: string } | null;
}

interface CatalogRepositoryPage {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: (CatalogRepositoryNode | null)[];
}

const ORG_CATALOG_REPOSITORIES_QUERY = `
  query (
    $org: String!
    $after: String
    $expression: String!
    $since: GitTimestamp
    $hasSince: Boolean!
  ) {
    organization(login: $org) {
      repositories(
        first: 50
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
            # Counting unbounded history is expensive and can time out (502)
            target @include(if: $hasSince) {
              ... on Commit {
                branchHistory: history(first: 1, since: $since) {
                  totalCount
                }
              }
            }
          }
          catalogFile: object(expression: $expression) {
            __typename
          }
        }
      }
    }
  }
`;

@Injectable()
export class GithubCatalogOrgScanner {
  constructor(
    private readonly auditService: AuditService,
    private readonly bullService: BullService,
    private readonly githubService: GithubService,
    private readonly githubTokenService: GithubTokenService,
    private readonly redisService: RedisService,
  ) {}

  public registerLeaderJob(): void {
    this.bullService.registerLeaderJob(
      BULL_LEADER_JOBS.GITHUB_CATALOG_SCAN,
      GITHUB_CATALOG_SCAN_CRON,
      () => this.enqueueOrgScans(),
    );
  }

  public async enqueueOrgScans(): Promise<void> {
    for (const org of GITHUB_CATALOG_ORGS) {
      const job: CatalogOrgScanJob = { type: 'org', org };
      await this.bullService.enqueue(
        REDIS_QUEUES.GITHUB_CATALOG_SCAN,
        job,
        {
          jobId: `org-${org}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
  }

  /**
   * Queue active repositories whose default branch changed since the last
   * successful scan and that have a root catalog file. Results are ordered by
   * repository push date so pagination can stop at the scan boundary.
   */
  public async scan(org: string): Promise<void> {
    const token = await this.githubTokenService.getOrgInstallationToken(org);
    const lastScanKey = `${GITHUB_CATALOG_LAST_SCAN_KEY_PREFIX}${org}`;
    const lastScan = await this.redisService.get(lastScanKey);
    const since = lastScan ? new Date(lastScan).getTime() : 0;
    const scanStartedAt = new Date().toISOString();
    let after: string | null = null;
    let hasNextPage = true;
    let count = 0;

    this.auditService.recordGitHubCatalogSync(
      'start',
      'unknown',
      `Starting catalog scan for ${org}`,
      { organization: org, lastScan },
    );

    while (hasNextPage) {
      const page = await this.queryRepositories(org, after, lastScan, token);
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
          repo.catalogFile?.__typename !== 'Blob' ||
          (lastScan &&
            !repo.defaultBranchRef.target?.branchHistory?.totalCount)
        ) {
          continue;
        }
        const job: CatalogRepoScanJob = {
          type: 'repo',
          org,
          repo: repo.name,
          defaultBranch: repo.defaultBranchRef.name,
          htmlUrl: repo.url,
          description: repo.description ?? undefined,
        };
        await this.bullService.enqueue(
          REDIS_QUEUES.GITHUB_CATALOG_SCAN,
          job,
          {
            jobId: `repo-${org}-${repo.name}`,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
        count++;
      }
      if (hasNextPage) {
        hasNextPage = page.pageInfo.hasNextPage;
        after = page.pageInfo.endCursor;
      }
    }

    await this.redisService.set(lastScanKey, scanStartedAt);
    this.auditService.recordGitHubCatalogSync(
      'info',
      'success',
      lastScan
        ? `Catalog scan queued ${count} repositories updated since ${lastScan} for ${org}`
        : `Catalog scan queued ${count} repositories for ${org}`,
      { organization: org, lastScan, queuedRepositories: count },
    );
  }

  private async queryRepositories(
    org: string,
    after: string | null,
    since: string | null,
    token: string,
  ): Promise<CatalogRepositoryPage> {
    const body = await this.githubService.graphql(
      ORG_CATALOG_REPOSITORIES_QUERY,
      {
        org,
        after,
        expression: `HEAD:${GITHUB_CATALOG_ROOT_FILE}`,
        since,
        hasSince: since !== null,
      },
      token,
    );
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
}
