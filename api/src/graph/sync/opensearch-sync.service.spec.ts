import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OpensearchSyncService } from './opensearch-sync.service';

describe('OpensearchSyncService', () => {
  let service: OpensearchSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpensearchSyncService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<OpensearchSyncService>(OpensearchSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
