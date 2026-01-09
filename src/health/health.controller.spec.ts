import { beforeEach, describe, it, expect, vi, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  // let healthCheckService: Record<string, Mock>;
  let healthService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    })
      .useMocker((token) => {
        if (token === HealthService) {
          return { check: vi.fn() };
        }
        return vi.fn();
      })
      .compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('ping calls healthService.check()', () => {
    controller.ping();
    expect(healthService.check).toHaveBeenCalled();
  });
});
