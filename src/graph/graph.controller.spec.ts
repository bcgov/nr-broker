import { Test, TestingModule } from '@nestjs/testing';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

describe('GraphController', () => {
  let controller: GraphController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let graphService: DeepMocked<GraphService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphController],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get<GraphController>(GraphController);
    graphService = module.get(GraphService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
