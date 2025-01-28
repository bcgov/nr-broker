import { Test, TestingModule } from '@nestjs/testing';
import { TeamCollectionService } from './team-collection.service';

describe('TeamCollectionService', () => {
  let service: TeamCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamCollectionService],
    }).compile();

    service = module.get<TeamCollectionService>(TeamCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
