import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { GraphService } from './graph.service';

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            duplicate: () => ({
              on: jest.fn(),
              connect: () => new Promise(() => {}),
            }),
          },
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<GraphService>(GraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
