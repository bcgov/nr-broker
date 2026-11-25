import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AxiosError } from 'axios';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('records GitHub catalog diagnostics as a dedicated audit event', () => {
    const putRecord = vi.fn();
    const auditService = new AuditService({ putRecord } as any, {} as any);
    const failure = new Error('GitHub query failed');

    auditService.recordGitHubCatalogSync(
      'end',
      'failure',
      'GitHub catalog scan failed',
      {
        organization: 'example',
        repository: 'service',
        repositoryId: 'repository-id',
        repositoryUrl: 'https://github.com/example/service',
        failure,
      },
    );

    expect(putRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'GitHub catalog scan failed',
        event: expect.objectContaining({
          action: 'sync-github-catalog',
          type: 'end',
          outcome: 'failure',
        }),
        labels: expect.objectContaining({
          github_organization: 'example',
          github_repository: 'service',
          repository_id: 'repository-id',
        }),
        url: { full: 'https://github.com/example/service' },
        error: { type: 'Error', message: 'GitHub query failed' },
      }),
    );
  });

  it.each([
    new AxiosError('Access denied', 'ERR_BAD_REQUEST', undefined, undefined, { status: 403 } as any),
    { state: 'partial', errorCode: '403', errorMessage: 'Access denied' },
  ])('preserves error codes and messages in sync audit records', (failure) => {
    const putRecord = vi.fn();
    const auditService = new AuditService({ putRecord } as any, {} as any);

    auditService.recordToolsSync('end', 'failure', 'Tool secret sync failed', undefined, undefined, failure);

    expect(putRecord).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: '403', message: 'Access denied' }),
    }));
  });

  it('records graph sync events with a separate audit action', () => {
    const putRecord = vi.fn();
    const auditService = new AuditService({ putRecord } as any, {} as any);
    const failure = Object.assign(new Error('Sync service unavailable'), { code: '503' });

    auditService.recordGraphSync('end', 'failure', 'Graph sync failed', undefined, undefined, failure);

    expect(putRecord).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Graph sync failed',
      event: expect.objectContaining({
        action: 'sync-graph',
        type: 'end',
        outcome: 'failure',
      }),
      error: expect.objectContaining({ code: '503', message: 'Sync service unavailable' }),
    }));
  });
});
