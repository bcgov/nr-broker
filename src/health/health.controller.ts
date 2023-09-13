import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { BrokerJwtAuthGuard } from '../auth/broker-jwt-auth.guard';
import { HealthService } from './health.service';

@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () =>
        this.http.pingCheck(
          'broker-api',
          'http://localhost:3000/v1/health/ping',
        ),
    ]);
  }

  @Get('ping')
  @HttpCode(204)
  ping() {
    this.healthService.check();
  }

  @Get('token-check')
  @HttpCode(204)
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  tokenCheck() {
    return;
  }
}
