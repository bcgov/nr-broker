import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { IntentionService } from './intention.service';

describe('IntentionService', () => {
  let service: IntentionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntentionService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<IntentionService>(IntentionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
