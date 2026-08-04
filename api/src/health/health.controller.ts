import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HttpHealthIndicator,
  MikroOrmHealthIndicator,
} from '@nestjs/terminus';
import { BrokerJwtAuthGuard } from '../auth/broker-jwt-auth.guard';
import { HealthService } from './health.service';
import { CommunicationHealthIndicator } from '../communication/communication.health';
import { SyncQueueHealthIndicator } from './sync-queue.health';

@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(
    private readonly communication: CommunicationHealthIndicator,
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly syncQueue: SyncQueueHealthIndicator,
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
      // Note: MikroORM does not establish a database connection until the first query is executed.
      // This means that the health check may fail on startup if it runs before any database operations have occurred.
      () => this.db.pingCheck('database'),
      () => this.syncQueue.isHealthy('syncQueue'),
      () => this.communication.isHealthy('communication'),
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
