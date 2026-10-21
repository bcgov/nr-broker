import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogUtil } from '../util/catalog.util';
import { GithubCatalogFileReader } from './github-catalog-file-reader.service';

describe('GithubCatalogFileReader', () => {
  let reader: GithubCatalogFileReader;
  let auditService: { recordGitHubCatalogSync: ReturnType<typeof vi.fn> };
  let githubService: { getRepoFileContent: ReturnType<typeof vi.fn> };

  const job = {
    type: 'repo' as const,
    org: 'org',
    repo: 'repo',
    htmlUrl: 'https://github.com/org/repo',
  };

  beforeEach(() => {
    auditService = { recordGitHubCatalogSync: vi.fn() };
    githubService = { getRepoFileContent: vi.fn() };
    reader = new GithubCatalogFileReader(
      auditService as any,
      new CatalogUtil(),
      githubService as any,
    );
  });

  it('follows unique root locations one level and audits missing targets', async () => {
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
      'api/catalog-info.yaml':
        'kind: Component\nmetadata:\n  name: api\nspec:\n  system: sys\n---\nkind: Location\nspec:\n  target: ../nested.yaml\n',
    };
    githubService.getRepoFileContent.mockImplementation(
      async (_org, _repo, path: string) => files[path] ?? null,
    );
    const loggerWarn = vi.spyOn((reader as any).logger, 'warn');

    const components = await reader.collectComponents(job, 'tkn');

    expect(components.map(({ name }) => name)).toEqual(['root', 'api']);
    expect(
      githubService.getRepoFileContent.mock.calls.map((call) => call[2]),
    ).toEqual(['catalog-info.yaml', 'api/catalog-info.yaml', 'missing.yaml']);
    expect(loggerWarn).toHaveBeenCalledWith(
      'Catalog location target not found: org/repo:missing.yaml',
    );
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'info',
      'unknown',
      'Catalog location target not found: org/repo:missing.yaml',
      {
        organization: 'org',
        repository: 'repo',
        repositoryId: undefined,
        repositoryUrl: 'https://github.com/org/repo',
        catalogPath: 'missing.yaml',
      },
    );
  });

  it('audits invalid catalog document warnings', async () => {
    githubService.getRepoFileContent.mockResolvedValue(
      'kind: Component\nmetadata: {}\n',
    );
    const loggerWarn = vi.spyOn((reader as any).logger, 'warn');

    await reader.collectComponents(job, 'tkn');

    expect(loggerWarn).toHaveBeenCalledWith(
      'Catalog component in catalog-info.yaml has no name',
    );
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'info',
      'unknown',
      'Catalog component in catalog-info.yaml has no name',
      expect.objectContaining({
        organization: 'org',
        repository: 'repo',
        catalogPath: 'catalog-info.yaml',
      }),
    );
  });
});
