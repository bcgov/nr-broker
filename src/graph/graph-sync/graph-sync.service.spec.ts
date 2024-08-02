import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { GraphSyncService } from './graph-sync.service';

describe('GraphSyncService', () => {
  let service: GraphSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphSyncService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<GraphSyncService>(GraphSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
