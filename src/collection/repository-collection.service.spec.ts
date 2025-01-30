import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { RepositoryCollectionService } from './repository-collection.service';

describe('RepositoryCollectionService', () => {
  let service: RepositoryCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RepositoryCollectionService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<RepositoryCollectionService>(
      RepositoryCollectionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
