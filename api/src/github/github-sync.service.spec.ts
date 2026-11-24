import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GithubSyncService } from './github-sync.service';
import { createMock } from '@golevelup/ts-vitest';
import { RepositoryEntity } from '../persistence/entity/repository.entity';
import { of } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import sodium from 'libsodium-wrappers';

describe('GithubSyncService', () => {
  let service: GithubSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubSyncService],
    })
      .useMocker(() => {
        return createMock({
          getRepoInstallationAccessToken: vi.fn(),
          getCollectionConfigByName: vi.fn(),
          listRepoCollaborators: vi.fn(),
          getUpstreamVertex: vi.fn(),
          addRepoCollaborator: vi.fn(),
          updateSyncStatus: vi.fn(),
          recordToolsSync: vi.fn(),
          getKv: vi.fn(),
          getPublicKey: vi.fn(),
          putRepoActionsSecret: vi.fn(),
        });
      })
      .compile();

    service = module.get<GithubSyncService>(GithubSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const repository = () => plainToInstance(RepositoryEntity, {
    id: 'r1', vertex: 'v1', scmUrl: 'https://github.com/org/repo',
    enableSyncUsers: true, enableSyncSecrets: true,
  });

  it('stores collaborator lookup failures and emits only one terminal failure', async () => {
    vi.spyOn(service['githubTokenService'], 'getRepoInstallationAccessToken').mockResolvedValue('token');
    vi.spyOn(service['collectionRepository'], 'getCollectionConfigByName').mockResolvedValue(createMock({ edgeToRoles: [] }));
    vi.spyOn(service['githubService'], 'listRepoCollaborators').mockRejectedValue(Object.assign(new Error('Access denied'), { code: '403' }));
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus').mockResolvedValue(undefined);
    const audit = vi.spyOn(service['auditService'], 'recordToolsSync');

    await service.syncUsers(repository());

    expect(status).toHaveBeenCalledWith(expect.any(Object), 'syncUsersStatus', 'syncAt', {
      state: 'failure', errorCode: '403', errorMessage: 'Access denied',
    });
    const terminal = audit.mock.calls.filter(([type]) => type === 'end');
    expect(terminal).toHaveLength(1);
    expect(terminal[0][1]).toBe('failure');
  });

  it('stores partial user sync results when one collaborator update fails', async () => {
    vi.spyOn(service['githubTokenService'], 'getRepoInstallationAccessToken').mockResolvedValue('token');
    vi.spyOn(service['collectionRepository'], 'getCollectionConfigByName').mockResolvedValue(createMock({
      edgeToRoles: [{ edge: ['maintainer'], role: 'maintain' }],
    }));
    vi.spyOn(service['githubService'], 'listRepoCollaborators').mockResolvedValue([]);
    vi.spyOn(service['graphRepository'], 'getUpstreamVertex').mockResolvedValue([
      createMock({ collection: { alias: [{ username: 'first' }] } }),
      createMock({ collection: { alias: [{ username: 'second' }] } }),
    ]);
    vi.spyOn(service['githubService'], 'addRepoCollaborator')
      .mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Collaborator update failed'));
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus').mockResolvedValue(undefined);
    const audit = vi.spyOn(service['auditService'], 'recordToolsSync');

    await service.syncUsers(repository());

    expect(status).toHaveBeenCalledWith(expect.any(Object), 'syncUsersStatus', 'syncAt',
      expect.objectContaining({ state: 'partial', errorMessage: 'Collaborator update failed' }));
    expect(audit.mock.calls.filter(([type]) => type === 'end').map((call) => call[1])).toEqual(['failure']);
  });

  it('stores partial secret sync results when an earlier write succeeded', async () => {
    vi.spyOn(service['vaultService'], 'getKv').mockReturnValue(of({ FIRST: 'value', SECOND: 'value' }));
    vi.spyOn(service['githubTokenService'], 'getRepoInstallationAccessToken').mockResolvedValue('token');
    await sodium.ready;
    vi.spyOn(service['githubService'], 'getPublicKey').mockResolvedValue({
      key: sodium.to_base64(sodium.crypto_box_keypair().publicKey, sodium.base64_variants.ORIGINAL),
      key_id: 'id',
    });
    vi.spyOn(service['githubService'], 'putRepoActionsSecret')
      .mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Secret write failed'));
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus').mockResolvedValue(undefined);

    await service.syncSecrets(createMock({ name: 'project' }), createMock({ name: 'service' }), repository());

    expect(status).toHaveBeenCalledWith(expect.any(Object), 'syncSecretsStatus', 'syncAt',
      expect.objectContaining({ state: 'partial', errorMessage: 'Secret write failed' }));
  });

  it('does not let a later successful service hide a repository secret sync failure', async () => {
    vi.spyOn(service['graphRepository'], 'getUpstreamVertex')
      .mockResolvedValueOnce([
        createMock({ collection: { name: 'first', vertex: 'first-v' } }),
        createMock({ collection: { name: 'second', vertex: 'second-v' } }),
      ])
      .mockResolvedValue([createMock({ collection: { name: 'project' } })]);
    const sync = vi.spyOn(service, 'syncSecrets')
      .mockResolvedValueOnce({ state: 'failure', errorCode: '403', errorMessage: 'Write denied' })
      .mockResolvedValueOnce({ state: 'success' });
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus');

    await service['syncRepositorySecrets'](repository());

    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync.mock.calls.every((call) => call[3] === false)).toBe(true);
    expect(status).toHaveBeenCalledExactlyOnceWith(
      expect.any(Object), 'syncSecretsStatus', 'syncAt',
      { state: 'partial', errorCode: '403', errorMessage: 'Write denied' },
    );
  });

  it('records and propagates graph lookup errors as before', async () => {
    vi.spyOn(service['graphRepository'], 'getUpstreamVertex').mockRejectedValue(new Error('Graph unavailable'));
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus');

    await expect(service['syncRepositorySecrets'](repository())).rejects.toThrow('Graph unavailable');

    expect(status).toHaveBeenCalledWith(
      expect.any(Object), 'syncSecretsStatus', 'syncAt',
      expect.objectContaining({ state: 'failure', errorMessage: 'Graph unavailable' }),
    );
  });

  describe('getOwnerAndRepoFromUrl', () => {
    it('should extract owner and repo from URL', () => {
      const repoUrl = 'https://github.com/myorg/mytestrepo.git';
      const result = service['getOwnerAndRepoFromUrl'](repoUrl); // Using private method directly for testing

      expect(result).toEqual({ owner: 'myorg', repo: 'mytestrepo' });
    });

    it('should throw an error for invalid URL', () => {
      const repoUrl = 'invalid_url';
      expect(() => service['getOwnerAndRepoFromUrl'](repoUrl)).toThrow(
        'Invalid GitHub URL',
      );
    });
  });
});
