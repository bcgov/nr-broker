import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { BrokerAuthGuard } from '../auth/broker-auth.guard';
import { HealthService } from './health.service';

@Controller({
  path: 'health',
  version: '1',
})
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
  @UseGuards(BrokerAuthGuard)
  @ApiBearerAuth()
  tokenCheck() {
    return;
  }
}
