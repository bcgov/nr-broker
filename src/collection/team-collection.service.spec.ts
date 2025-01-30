import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { TeamCollectionService } from './team-collection.service';

describe('TeamCollectionService', () => {
  let service: TeamCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamCollectionService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<TeamCollectionService>(TeamCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
