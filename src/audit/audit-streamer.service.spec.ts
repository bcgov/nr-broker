import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditStreamerService } from './audit-streamer.service';

describe('AuditStreamerService', () => {
  let service: AuditStreamerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditStreamerService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<AuditStreamerService>(AuditStreamerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
