import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
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
    private readonly db: TypeOrmHealthIndicator,
  ) {}

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
