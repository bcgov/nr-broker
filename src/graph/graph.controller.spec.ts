import { beforeEach, describe, it, expect, vi, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

describe('GraphController', () => {
  let controller: GraphController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let graphService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphController],
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            emit: vi.fn(),
          },
        },
      ],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    controller = module.get<GraphController>(GraphController);
    graphService = module.get(GraphService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
