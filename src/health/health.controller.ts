import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HttpHealthIndicator,
  MikroOrmHealthIndicator,
} from '@nestjs/terminus';
import { BrokerJwtAuthGuard } from '../auth/broker-jwt-auth.guard';
import { HealthService } from './health.service';
import { GithubHealthIndicator } from '../github/github.health';

@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly github: GithubHealthIndicator,
    private readonly healthService: HealthService,
    private readonly db: MikroOrmHealthIndicator,
  ) {}

  /**
   * Broker's full health check details
   */
  @Get()
  check() {
    return this.health.check([
      () =>
        this.http.pingCheck(
          'broker-api',
          'http://localhost:3000/v1/health/ping',
        ),
      () => this.db.pingCheck('database'),
      () => this.github.isHealthy('github'),
    ]);
  }

  /**
   * Lightweight Broker health check
   */
  @Get('ping')
  @HttpCode(204)
  @ApiResponse({
    status: 204,
    description: 'Status code if healthy',
  })
  ping() {
    this.healthService.check();
  }

  /**
   * Lightweight Broker token check
   */
  @Get('token-check')
  @HttpCode(204)
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 204,
    description: 'Status code if healthy',
  })
  tokenCheck() {
    return;
  }
}
