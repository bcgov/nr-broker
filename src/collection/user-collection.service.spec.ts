import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { UserCollectionService } from './user-collection.service';

describe('UserCollectionService', () => {
  let service: UserCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserCollectionService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<UserCollectionService>(UserCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
