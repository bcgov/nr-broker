import { describe, expect, it, vi } from 'vitest';
import { GithubCatalogService } from './github-catalog.service';

describe('GithubCatalogService', () => {
  const build = () => {
    const auditService = { recordGitHubCatalogSync: vi.fn() };
    const bullService = { enqueue: vi.fn(), registerWorker: vi.fn() };
    const catalogSyncService = { syncRepository: vi.fn() };
    const githubTokenService = {
      getOrgInstallationToken: vi.fn().mockResolvedValue('tkn'),
    };
    const fileReader = { collectComponents: vi.fn().mockResolvedValue([{ name: 'a' }]) };
    const orgScanner = { scan: vi.fn(), registerLeaderJob: vi.fn(), enqueueOrgScans: vi.fn() };
    const collectionRepository = {
      getCollectionById: vi
        .fn()
        .mockResolvedValue({ id: 'r1', scmUrl: 'https://github.com/org/repo' }),
    };
    const graphService = { updateSyncStatus: vi.fn() };
    const service = new GithubCatalogService(
      auditService as any,
      bullService as any,
      catalogSyncService as any,
      githubTokenService as any,
      fileReader as any,
      orgScanner as any,
      collectionRepository as any,
      graphService as any,
    );
    return {
      service,
      auditService,
      bullService,
      catalogSyncService,
      fileReader,
      orgScanner,
      collectionRepository,
      graphService,
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

    expect(fileReader.collectComponents).toHaveBeenCalledWith(
      { ...repoJob, repositoryId: 'r1' },
      'tkn',
    );
    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'repo', scmUrl: repoJob.htmlUrl }),
      [{ name: 'a' }],
    );
    expect(graphService.updateSyncStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1' }),
      'syncCatalogStatus',
      'syncAt',
    );
  });

  it('looks up repositories queued by id', async () => {
    const { service, graphService, catalogSyncService } = build();

    await service.processJob('r1');

    expect(catalogSyncService.syncRepository).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'repo', scmUrl: repoJob.htmlUrl }),
      [{ name: 'a' }],
    );
    expect(graphService.updateSyncStatus).toHaveBeenCalled();
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

  it('does not record sync status for scheduled repository scans', async () => {
    const { service, graphService } = build();

    await service.processJob(repoJob);

    expect(graphService.updateSyncStatus).not.toHaveBeenCalled();
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
