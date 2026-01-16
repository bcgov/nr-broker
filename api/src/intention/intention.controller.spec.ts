import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PersistenceModule } from '../persistence/persistence.module';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';

describe.skip('IntentionController', () => {
  let controller: IntentionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntentionController],
      providers: [IntentionService],
      imports: [PersistenceModule],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    controller = module.get<IntentionController>(IntentionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
