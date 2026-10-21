import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GITHUB_CATALOG_ORGS } from '../constants';
import { GithubCatalogOrgScanner } from './github-catalog-org-scanner.service';

describe('GithubCatalogOrgScanner', () => {
  const repository = (
    name: string,
    pushedAt: string | null,
    extra: object = {},
  ) => ({
    name,
    url: `https://github.com/org/${name}`,
    description: null,
    isArchived: false,
    isDisabled: false,
    pushedAt,
    defaultBranchRef: {
      name: 'main',
      target: { branchHistory: { totalCount: 1 } },
    },
    catalogFile: { __typename: 'Blob' },
    ...extra,
  });

  let scanner: GithubCatalogOrgScanner;
  let auditService: { recordGitHubCatalogSync: ReturnType<typeof vi.fn> };
  let bullService: { enqueue: ReturnType<typeof vi.fn>; registerLeaderJob: ReturnType<typeof vi.fn> };
  let githubService: { graphql: ReturnType<typeof vi.fn> };
  let tokenService: { getOrgInstallationToken: ReturnType<typeof vi.fn> };
  let redisService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auditService = { recordGitHubCatalogSync: vi.fn() };
    bullService = { enqueue: vi.fn(), registerLeaderJob: vi.fn() };
    githubService = { graphql: vi.fn() };
    tokenService = { getOrgInstallationToken: vi.fn().mockResolvedValue('tkn') };
    redisService = { get: vi.fn(), set: vi.fn() };
    scanner = new GithubCatalogOrgScanner(
      auditService as any,
      bullService as any,
      githubService as any,
      tokenService as any,
      redisService as any,
    );
  });

  const enqueuedRepos = () =>
    bullService.enqueue.mock.calls.map((call) => call[1].repo);

  it('queues an organization scan for every configured organization', async () => {
    await scanner.enqueueOrgScans();

    expect(bullService.enqueue).toHaveBeenCalledTimes(
      GITHUB_CATALOG_ORGS.length,
    );
    GITHUB_CATALOG_ORGS.forEach((org, index) => {
      expect(bullService.enqueue).toHaveBeenNthCalledWith(
        index + 1,
        'github-catalog-scan',
        { type: 'org', org },
        {
          jobId: `org-${org}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    });
  });

  it('queues active repositories with catalog files pushed since the last scan', async () => {
    redisService.get.mockResolvedValue('2026-01-10T00:00:00.000Z');
    githubService.graphql.mockResolvedValue({
      data: {
        organization: {
          repositories: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor' },
            nodes: [
              repository('new', '2026-01-12T00:00:00Z'),
              repository('pushed', '2026-01-11T00:00:00Z'),
              repository('no-catalog', '2026-01-11T00:00:00Z', {
                catalogFile: null,
              }),
              repository('tree', '2026-01-11T00:00:00Z', {
                catalogFile: { __typename: 'Tree' },
              }),
              repository('archived', '2026-01-11T00:00:00Z', {
                isArchived: true,
              }),
              repository('old', '2026-01-09T00:00:00Z'),
            ],
          },
        },
      },
    });

    await scanner.scan('org');

    expect(enqueuedRepos()).toEqual(['new', 'pushed']);
    expect(bullService.enqueue.mock.calls[0]).toEqual([
      'github-catalog-scan',
      expect.objectContaining({
        type: 'repo',
        org: 'org',
        repo: 'new',
        defaultBranch: 'main',
        htmlUrl: 'https://github.com/org/new',
      }),
      expect.objectContaining({ jobId: 'repo-org-new' }),
    ]);
    expect(redisService.set).toHaveBeenCalledWith(
      'github-catalog-scan:last-scan:org',
      expect.any(String),
    );
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'info',
      'success',
      expect.stringContaining('Catalog scan queued 2 repositories'),
      {
        organization: 'org',
        lastScan: '2026-01-10T00:00:00.000Z',
        queuedRepositories: 2,
      },
    );
  });

  it('continues paging when no previous scan exists', async () => {
    redisService.get.mockResolvedValue(null);
    githubService.graphql
      .mockResolvedValueOnce({
        data: {
          organization: {
            repositories: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
              nodes: [repository('a', '2026-01-12T00:00:00Z')],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          organization: {
            repositories: {
              pageInfo: { hasNextPage: false, endCursor: 'cursor-2' },
              nodes: [repository('b', '2020-01-01T00:00:00Z')],
            },
          },
        },
      });

    await scanner.scan('org');

    expect(githubService.graphql).toHaveBeenCalledTimes(2);
    expect(githubService.graphql.mock.calls[1][1].after).toBe('cursor-1');
    expect(enqueuedRepos()).toEqual(['a', 'b']);
  });

  it('does not save last scan time when GitHub query fails', async () => {
    redisService.get.mockResolvedValue(null);
    githubService.graphql.mockResolvedValue({ errors: [{ message: 'boom' }] });

    await expect(scanner.scan('org')).rejects.toThrow('boom');

    expect(redisService.set).not.toHaveBeenCalled();
  });
});
