import { beforeEach, describe, it, expect, vi, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

describe('CollectionController', () => {
  let controller: CollectionController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let collectionService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            emit: vi.fn(),
          },
        },
      ],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    controller = module.get<CollectionController>(CollectionController);
    collectionService = module.get(CollectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
