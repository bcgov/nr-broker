import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { KubernetesSyncService } from './kubernetes-sync.service';
import { CloudDto } from '../persistence/dto/cloud.dto';
import { OpenshiftProjectEntity } from '../persistence/entity/openshift-project.entity';

describe('KubernetesSyncService outcomes', () => {
  let service: KubernetesSyncService;
  const cloud = createMock<CloudDto>({ name: 'cloud', vertex: 'cloud-v', apiUrl: 'https://cluster.example.com' });
  const project = createMock<OpenshiftProjectEntity>({ name: 'project', vertex: 'project-v' });

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [KubernetesSyncService] })
      .useMocker(() => createMock({
        recordToolsSync: vi.fn(),
        getKv: vi.fn(),
        updateSyncStatus: vi.fn(),
        getCollectionByKeyValue: vi.fn(),
        getUpstreamVertex: vi.fn(),
        getDownstreamVertex: vi.fn(),
      }))
      .compile();
    service = module.get(KubernetesSyncService);
  });

  it('stores configuration read failures with the underlying error code', async () => {
    vi.spyOn(service['vaultService'], 'getKv').mockReturnValue(throwError(() =>
      Object.assign(new Error('Vault unavailable'), { code: 'ECONNREFUSED' })));
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus');
    const audit = vi.spyOn(service['auditService'], 'recordToolsSync');

    await service.syncSecrets(cloud, project);

    expect(status).toHaveBeenCalledWith(project, 'syncSecretsStatus', 'syncAt',
      expect.objectContaining({ state: 'failure', errorCode: 'ECONNREFUSED', errorMessage: expect.stringContaining('Vault unavailable') }));
    expect(audit.mock.calls.filter(([type]) => type === 'end').map((call) => call[1])).toEqual(['failure']);
  });

  it('stores partial completion when a later Kubernetes write fails', async () => {
    vi.spyOn(service['vaultService'], 'getKv')
      .mockReturnValueOnce(of({
        serviceAccountToken: 'test-token',
        secrets: JSON.stringify([
          { service: 'service', destinationSecretName: 'first' },
          { service: 'service', destinationSecretName: 'second' },
        ]),
      }))
      .mockReturnValue(of({ key: 'value' }));
    vi.spyOn(service['collectionRepository'], 'getCollectionByKeyValue').mockResolvedValue(createMock({ name: 'service', vertex: 'service-v' }));
    vi.spyOn(service['graphService'], 'getUpstreamVertex').mockResolvedValue([createMock({ collection: { name: 'project' } })]);
    vi.spyOn(service['graphService'], 'getDownstreamVertex').mockResolvedValue([createMock({ collection: { vertex: 'cloud-v' } })]);
    vi.spyOn(service['axiosInstance'], 'get').mockResolvedValue({ data: {} });
    const put = vi.spyOn(service['axiosInstance'], 'put')
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(new AxiosError('Access denied', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 403, data: { message: 'Write denied' },
      } as any));
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus');
    const audit = vi.spyOn(service['auditService'], 'recordToolsSync');

    await service.syncSecrets(cloud, project);

    expect(put).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenCalledWith(project, 'syncSecretsStatus', 'syncAt',
      { state: 'partial', errorCode: '403', errorMessage: 'Secret second: Write denied' });
    expect(audit.mock.calls.filter(([type]) => type === 'end').map((call) => call[1])).toEqual(['failure']);
  });

  it('marks empty mappings as skipped', async () => {
    vi.spyOn(service['vaultService'], 'getKv').mockReturnValue(of({
      serviceAccountToken: 'test-token', secrets: '[]',
    }));
    const status = vi.spyOn(service['graphService'], 'updateSyncStatus');

    await service.syncSecrets(cloud, project);

    expect(status).toHaveBeenCalledWith(project, 'syncSecretsStatus', 'syncAt',
      expect.objectContaining({ state: 'skipped' }));
  });
});
