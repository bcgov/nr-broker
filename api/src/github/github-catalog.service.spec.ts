import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CatalogUtil } from '../util/catalog.util';
import { GithubCatalogService } from './github-catalog.service';

describe('GithubCatalogService', () => {
  let service: GithubCatalogService;

  beforeEach(() => {
    service = new GithubCatalogService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new CatalogUtil(),
    );
  });

  describe('collectComponents', () => {
    it('follows unique root locations one level and ignores nested locations', async () => {
      const files: Record<string, string> = {
        'catalog-info.yaml': [
          'kind: Component',
          'metadata:',
          '  name: root',
          '---',
          'kind: Location',
          'spec:',
          '  targets:',
          '    - ./catalog-info.yaml',
          '    - ./api/catalog-info.yaml',
          '    - ./missing.yaml',
          '---',
          'kind: Location',
          'spec:',
          '  target: ./api/catalog-info.yaml',
        ].join('\n'),
        'api/catalog-info.yaml': 'kind: Component\nmetadata:\n  name: api\nspec:\n  system: sys\n---\nkind: Location\nspec:\n  target: ../nested.yaml\n',
        'nested.yaml': 'kind: Component\nmetadata:\n  name: nested\n',
      };
      const fetchFile = vi
        .spyOn(service as any, 'fetchFile')
        .mockImplementation(async (_job, path: string) => files[path] ?? null);

      const components = await (service as any).collectComponents({}, 'tkn');

      expect(components.map((c: { name: string }) => c.name)).toEqual(['root', 'api']);
      expect(fetchFile.mock.calls.map((call) => call[1])).toEqual([
        'catalog-info.yaml',
        'api/catalog-info.yaml',
        'missing.yaml',
      ]);
    });
  });

  describe('processJob (org)', () => {
    const repo = (name: string, pushedAt: string | null, extra: object = {}) => ({
      name,
      url: `https://github.com/org/${name}`,
      description: null,
      isArchived: false,
      isDisabled: false,
      pushedAt,
      defaultBranchRef: { name: 'main' },
      catalogFile: { __typename: 'Blob' },
      ...extra,
    });

    let bullService: { enqueue: ReturnType<typeof vi.fn> };
    let redisService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
    let post: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      bullService = { enqueue: vi.fn() };
      redisService = { get: vi.fn(), set: vi.fn() };
      service = new GithubCatalogService(
        { recordToolsSync: vi.fn() } as any,
        bullService as any,
        {} as any,
        {} as any,
        redisService as any,
        new CatalogUtil(),
      );
      vi.spyOn(service as any, 'getOrgInstallationToken').mockResolvedValue('tkn');
      post = vi.fn();
      (service as any).axiosInstance = { post };
    });

    const enqueuedRepos = () =>
      bullService.enqueue.mock.calls.map((call) => call[1].repo);

    it('queues only active repositories with a catalog file pushed since the last scan', async () => {
      redisService.get.mockResolvedValue('2026-01-10T00:00:00.000Z');
      post.mockResolvedValueOnce({
        data: {
          data: {
            organization: {
              repositories: {
                pageInfo: { hasNextPage: true, endCursor: 'c1' },
                nodes: [
                  repo('new', '2026-01-12T00:00:00Z'),
                  repo('pushed', '2026-01-11T00:00:00Z'),
                  repo('no-catalog', '2026-01-11T00:00:00Z', { catalogFile: null }),
                  repo('tree', '2026-01-11T00:00:00Z', { catalogFile: { __typename: 'Tree' } }),
                  repo('empty', '2026-01-11T00:00:00Z', { defaultBranchRef: null }),
                  repo('archived', '2026-01-11T00:00:00Z', { isArchived: true }),
                  repo('old', '2026-01-09T00:00:00Z'),
                  repo('older', '2026-01-08T00:00:00Z'),
                ],
              },
            },
          },
        },
      });

      await service.processJob({ type: 'org', org: 'org' });

      expect(post).toHaveBeenCalledTimes(1);
      expect(post.mock.calls[0][1].variables).toEqual({
        org: 'org',
        after: null,
        expression: 'HEAD:catalog-info.yaml',
      });
      expect(enqueuedRepos()).toEqual(['new', 'pushed']);
      expect(bullService.enqueue.mock.calls[0][1]).toMatchObject({
        type: 'repo',
        org: 'org',
        repo: 'new',
        defaultBranch: 'main',
        htmlUrl: 'https://github.com/org/new',
      });
      expect(redisService.set).toHaveBeenCalledWith(
        'github-catalog-scan:last-scan:org',
        expect.any(String),
      );
    });

    it('pages through all repositories when there is no previous scan', async () => {
      redisService.get.mockResolvedValue(null);
      post
        .mockResolvedValueOnce({
          data: {
            data: {
              organization: {
                repositories: {
                  pageInfo: { hasNextPage: true, endCursor: 'c1' },
                  nodes: [repo('a', '2026-01-12T00:00:00Z')],
                },
              },
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              organization: {
                repositories: {
                  pageInfo: { hasNextPage: false, endCursor: 'c2' },
                  nodes: [repo('b', '2020-01-01T00:00:00Z'), repo('empty', null)],
                },
              },
            },
          },
        });

      await service.processJob({ type: 'org', org: 'org' });

      expect(post).toHaveBeenCalledTimes(2);
      expect(post.mock.calls[1][1].variables.after).toBe('c1');
      expect(enqueuedRepos()).toEqual(['a', 'b']);
    });

    it('does not record the scan time when the query fails', async () => {
      redisService.get.mockResolvedValue(null);
      post.mockResolvedValueOnce({ data: { errors: [{ message: 'boom' }] } });

      await expect(
        service.processJob({ type: 'org', org: 'org' }),
      ).rejects.toThrow('boom');
      expect(redisService.set).not.toHaveBeenCalled();
    });
  });
});
