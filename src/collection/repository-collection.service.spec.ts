import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryCollectionService } from './repository-collection.service';

describe('RepositoryCollectionService', () => {
  let service: RepositoryCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RepositoryCollectionService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<RepositoryCollectionService>(
      RepositoryCollectionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
