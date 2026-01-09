import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphSyncService } from './graph-sync.service';

describe('GraphSyncService', () => {
  let service: GraphSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphSyncService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<GraphSyncService>(GraphSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
