import { Test, TestingModule } from '@nestjs/testing';
import { PersistenceModule } from '../persistence/persistence.module';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';

describe('IntentionController', () => {
  let controller: IntentionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntentionController],
      providers: [IntentionService],
      imports: [PersistenceModule],
    })
      .useMocker((token) => {
        if (token === IntentionService) {
          return {
            create: jest.fn().mockResolvedValue(null),
            close: jest.fn().mockResolvedValue(null),
          };
        }
      })
      .compile();

    controller = module.get<IntentionController>(IntentionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
