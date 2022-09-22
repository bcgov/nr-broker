import { Test, TestingModule } from '@nestjs/testing';
import { IntentionController } from './intention.controller';

xdescribe('IntentionController', () => {
  let controller: IntentionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntentionController],
    }).compile();

    controller = module.get<IntentionController>(IntentionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
