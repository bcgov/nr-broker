import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserCollectionService } from './user-collection.service';

describe('UserCollectionService', () => {
  let service: UserCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserCollectionService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<UserCollectionService>(UserCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
