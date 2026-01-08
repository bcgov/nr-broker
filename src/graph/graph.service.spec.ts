import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<GraphService>(GraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
