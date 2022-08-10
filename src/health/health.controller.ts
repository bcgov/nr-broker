import { Controller, Get, HttpCode } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () =>
        this.http.pingCheck('broker-api', 'http://localhost:3000/health/ping'),
    ]);
  }

  @Get('ping')
  @HttpCode(204)
  ping() {
    this.healthService.check();
  }
}
