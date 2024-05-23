import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  // let healthCheckService: DeepMocked<HealthCheckService>;
  let healthService: DeepMocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    })
      .useMocker(createMock)
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
