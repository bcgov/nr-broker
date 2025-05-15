import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

jest.mock('nodemailer-express-handlebars', () => jest.fn());
describe('CollectionController', () => {
  let controller: CollectionController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let collectionService: DeepMocked<CollectionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get<CollectionController>(CollectionController);
    collectionService = module.get(CollectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
