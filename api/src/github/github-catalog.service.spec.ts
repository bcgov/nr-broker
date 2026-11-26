import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { GithubCatalogService } from './github-catalog.service';
import { GithubApiOperationError } from './github-token.service';

describe('GithubCatalogService', () => {
  const build = () => {
    const auditService = { recordGitHubCatalogSync: vi.fn() };
    const bullService = { enqueue: vi.fn(), registerWorker: vi.fn() };
    const catalogSyncService = { syncRepository: vi.fn().mockResolvedValue({ state: 'success' }) };
    const githubTokenService = {
      getOrgInstallationToken: vi.fn().mockResolvedValue('tkn'),
    };
    const fileReader = {
      collectEntities: vi.fn().mockResolvedValue({ entities: [{ name: 'a' }], complete: true }),
    };
    const orgScanner = { scan: vi.fn(), registerLeaderJob: vi.fn(), enqueueOrgScans: vi.fn() };
    const collectionRepository = {
      getCollectionByKeyValue: vi.fn().mockResolvedValue(null),
      getCollectionById: vi
        .fn()
        .mockResolvedValue({ id: 'r1', scmUrl: 'https://github.com/org/repo' }),
    };
    const graphService = { updateSyncStatus: vi.fn() };
    const githubService = {
      getRepoMetadata: vi.fn().mockResolvedValue({
        description: 'Repository description from GitHub',
        topics: ['broker', 'typescript'],
      }),
    };
    const service = new GithubCatalogService(
      auditService as any,
      bullService as any,
      catalogSyncService as any,
      githubTokenService as any,
      fileReader as any,
      orgScanner as any,
      collectionRepository as any,
      graphService as any,
      githubService as any,
    );
    return {
      service,
      auditService,
      bullService,
      catalogSyncService,
      githubTokenService,
      fileReader,
      orgScanner,
      collectionRepository,
      graphService,
      githubService,
    };
  };

  const repoJob = {
    type: 'repo' as const,
    org: 'org',
    repo: 'repo',
    htmlUrl: 'https://github.com/org/repo',
  };

  it('delegates organization jobs to the organization scanner', async () => {
    const { service, orgScanner } = build();

    await service.processJob({ type: 'org', org: 'example' });

    expect(orgScanner.scan).toHaveBeenCalledWith('example');
  });

  it('syncs repository components and updates collection sync status', async () => {
    const { service, graphService, catalogSyncService, fileReader } = build();

    await service.processJob({ ...repoJob, repositoryId: 'r1' });

    expect(fileReader.collectEntities).toHaveBeenCalledWith(
      { ...repoJob, repositoryId: 'r1' },
      'tkn',
    );
    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'repo', scmUrl: repoJob.htmlUrl }),
      [{ name: 'a' }],
      true,
    );
    expect(graphService.updateSyncStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1' }),
      'syncCatalogStatus',
      'syncAt',
      { state: 'success' },
    );
  });

  it('looks up repositories queued by id', async () => {
    const { service, graphService, catalogSyncService, githubService } = build();

    await service.processJob('r1');

    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'repo',
        scmUrl: repoJob.htmlUrl,
        description: 'Repository description from GitHub',
        tags: ['broker', 'typescript'],
      }),
      [{ name: 'a' }],
      true,
    );
    expect(githubService.getRepoMetadata).toHaveBeenCalledWith('org', 'repo', 'tkn');
    expect(graphService.updateSyncStatus).toHaveBeenCalled();
  });

  it('fetches description and topics for direct repository scan jobs', async () => {
    const { service, catalogSyncService, githubService } = build();

    await service.processJob(repoJob);

    expect(githubService.getRepoMetadata).toHaveBeenCalledWith('org', 'repo', 'tkn');
    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Repository description from GitHub',
        tags: ['broker', 'typescript'],
      }),
      [{ name: 'a' }],
      true,
    );
  });

  it.each([{ tags: [] }, { tags: ['scheduled-topic'] }])('uses metadata already included in a scan job: $tags', async ({ tags }) => {
    const { service, catalogSyncService, githubService } = build();

    await service.processJob({ ...repoJob, description: 'Scheduled description', tags });

    expect(githubService.getRepoMetadata).not.toHaveBeenCalled();
    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Scheduled description', tags }),
      [{ name: 'a' }],
      true,
    );
  });

  it('fetches a missing description without replacing topics included in the job', async () => {
    const { service, catalogSyncService } = build();

    await service.processJob({ ...repoJob, tags: ['queued-topic'] });

    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Repository description from GitHub',
        tags: ['queued-topic'],
      }),
      [{ name: 'a' }],
      true,
    );
  });

  it('uses the organization and name only when GitHub has no description', async () => {
    const { service, catalogSyncService, githubService } = build();
    githubService.getRepoMetadata.mockResolvedValue({ description: null, topics: [] });

    await service.processJob('r1');

    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'org/repo' }),
      [{ name: 'a' }],
      true,
    );
  });

  it('passes an empty topic list through to clear repository tags', async () => {
    const { service, catalogSyncService, githubService } = build();
    githubService.getRepoMetadata.mockResolvedValue({ description: null, topics: [] });

    await service.processJob('r1');

    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] }),
      [{ name: 'a' }],
      true,
    );
  });

  it('reports metadata lookup failures without syncing or recording success', async () => {
    const { service, catalogSyncService, githubService, graphService, auditService } = build();
    const failure = new Error('Metadata lookup failed');
    githubService.getRepoMetadata.mockRejectedValue(failure);

    await expect(service.processJob('r1')).rejects.toThrow('Metadata lookup failed');

    expect(catalogSyncService.syncRepository).not.toHaveBeenCalled();
    expect(graphService.updateSyncStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1' }), 'syncCatalogStatus', 'syncAt',
      { state: 'failure', errorMessage: 'Metadata lookup failed' },
    );
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'end', 'failure', expect.any(String), expect.objectContaining({ failure }),
    );
  });

  it('audits and skips repository ids with unmanaged URLs', async () => {
    const { service, catalogSyncService, collectionRepository, auditService } =
      build();
    collectionRepository.getCollectionById.mockResolvedValue({
      id: 'r1',
      scmUrl: 'https://example.com/org/repo',
    });

    await service.processJob('r1');

    expect(catalogSyncService.syncRepository).not.toHaveBeenCalled();
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'info',
      'unknown',
      'Skip catalog sync of unmanaged url (r1)',
      {
        repositoryId: 'r1',
        repositoryUrl: 'https://example.com/org/repo',
      },
    );
  });

  it('queues a scan only for managed URLs', async () => {
    const { service, bullService } = build();
    vi.spyOn(service, 'isCatalogOrg').mockImplementation(
      (org) => org === 'org',
    );

    await expect(
      service.enqueueRepoScan('https://github.com/other/repo'),
    ).rejects.toThrow('not in the configured catalog organizations');
    expect(await service.enqueueRepoScan(repoJob.htmlUrl)).toBe(true);
    expect(bullService.enqueue).toHaveBeenCalledWith(
      'github-catalog-scan',
      expect.objectContaining({ type: 'repo', org: 'org', repo: 'repo' }),
      expect.objectContaining({ jobId: 'repo-org-repo' }),
    );

    expect(await service.enqueueRepoScan('https://example.com/org/repo')).toBe(
      false,
    );
    expect(bullService.enqueue).toHaveBeenCalledTimes(1);
  });

  it('does not record sync status when no repository record exists', async () => {
    const { service, graphService } = build();

    await service.processJob(repoJob);

    expect(graphService.updateSyncStatus).not.toHaveBeenCalled();
  });

  it('stores the partial result returned by catalog sync on scheduled repositories', async () => {
    const { service, catalogSyncService, collectionRepository, graphService } = build();
    const result = { state: 'partial', errorCode: '400', errorMessage: 'Instance sync failed' };
    catalogSyncService.syncRepository.mockResolvedValue(result);
    collectionRepository.getCollectionByKeyValue.mockResolvedValue({ id: 'r1' });

    await service.processJob(repoJob);

    expect(graphService.updateSyncStatus).toHaveBeenCalledWith(
      { id: 'r1' }, 'syncCatalogStatus', 'syncAt', result,
    );
  });

  it('stores access denials before suppressing non-retryable errors', async () => {
    const { service, fileReader, graphService } = build();
    fileReader.collectEntities.mockRejectedValue(new AxiosError(
      'Access denied', 'ERR_BAD_REQUEST', undefined, undefined, { status: 403 } as any,
    ));

    await service.processJob('r1');

    expect(graphService.updateSyncStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1' }), 'syncCatalogStatus', 'syncAt',
      { state: 'failure', errorCode: '403', errorMessage: 'Access denied' },
    );
  });

  it('records a missing catalog as skipped rather than successful', async () => {
    const { service, fileReader, graphService } = build();
    fileReader.collectEntities.mockResolvedValue(null);

    await service.processJob('r1');

    expect(graphService.updateSyncStatus).toHaveBeenCalledWith(
      expect.any(Object), 'syncCatalogStatus', 'syncAt',
      expect.objectContaining({ state: 'skipped', errorCode: 'CATALOG_NOT_FOUND' }),
    );
  });

  it('passes incomplete snapshots to sync without authorizing cleanup', async () => {
    const { service, fileReader, catalogSyncService } = build();
    fileReader.collectEntities.mockResolvedValue({ entities: [{ name: 'a' }], complete: false });

    await service.processJob(repoJob);

    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.any(Object), [{ name: 'a' }], false,
    );
  });

  it('does not reconcile edges when the root catalog file is missing', async () => {
    const { service, fileReader, catalogSyncService } = build();
    fileReader.collectEntities.mockResolvedValue(null);

    await service.processJob(repoJob);

    expect(catalogSyncService.syncRepository).not.toHaveBeenCalled();
  });

  it('audits and swallows 403 errors from GitHub', async () => {
    const { service, auditService, fileReader } = build();
    fileReader.collectEntities.mockRejectedValue(
      new AxiosError('denied', '403', undefined, undefined, {
        status: 403,
      } as any),
    );

    await expect(service.processJob(repoJob)).resolves.toBeUndefined();
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'end',
      'failure',
      expect.stringContaining('denied access (403)'),
      expect.anything(),
    );
  });

  it('audits and skips retries for installation access denials', async () => {
    const { service, auditService, githubTokenService } = build();
    const failure = new GithubApiOperationError(
      'getOrgInstallationId',
      'org',
      new AxiosError(
        'Request failed with status code 403',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 403,
          data: { message: 'Resource not accessible by integration' },
        } as any,
      ),
    );
    githubTokenService.getOrgInstallationToken.mockRejectedValue(failure);

    await expect(service.processJob(repoJob)).resolves.toBeUndefined();
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'end',
      'failure',
      failure.message,
      expect.objectContaining({ failure }),
    );
  });

  it('audits the GitHub installation API operation and propagates rate limits', async () => {
    const { service, auditService, githubTokenService } = build();
    const failure = new GithubApiOperationError(
      'createInstallationAccessToken',
      'org',
      new AxiosError(
        'Request failed with status code 403',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 403,
          data: { message: 'You have exceeded a secondary rate limit' },
          headers: { 'retry-after': '60' },
        } as any,
      ),
    );
    githubTokenService.getOrgInstallationToken.mockRejectedValue(failure);

    await expect(service.processJob(repoJob)).rejects.toBe(failure);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'end',
      'failure',
      failure.message,
      expect.objectContaining({ failure }),
    );
  });

  it('registers the org scanner leader job when enabled', () => {
    const { service, orgScanner } = build();
    vi.spyOn(service, 'isEnabled').mockReturnValue(true);
    vi.spyOn(service, 'isSyncEnabled').mockReturnValue(true);
    const bullService = (service as any).bullService;

    service.onModuleInit();

    expect(orgScanner.registerLeaderJob).toHaveBeenCalled();
    expect(bullService.registerWorker).toHaveBeenCalled();
  });
});
