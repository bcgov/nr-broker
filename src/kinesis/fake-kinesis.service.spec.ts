import { Test, TestingModule } from '@nestjs/testing';
import { FakeKinesisService } from './fake-kinesis.service';

describe('FakeKinesisService', () => {
  let service: FakeKinesisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FakeKinesisService],
    }).compile();

    service = module.get<FakeKinesisService>(FakeKinesisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
