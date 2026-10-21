import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';

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
});
