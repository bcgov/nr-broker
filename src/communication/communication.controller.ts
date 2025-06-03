import {
  Controller,
  HttpCode,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

import { RedisService } from '../redis/redis.service';
import { Roles } from '../roles.decorator';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { CommunicationQueueService } from './communication-queue.service';

export class CommunicationTestQuery {
  vertexId: string;
  toRole: string;
  template: string;
}

@Controller({
  path: 'communication',
  version: '1',
})
export class CommunicationController {
  constructor(
    private readonly communicationQueueService: CommunicationQueueService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Test endpoint to queue a notification
   * This is used to test the communication queue functionality.
   */
  @Post('test')
  @Roles('admin')
  @UseGuards(BrokerOidcAuthGuard)
  @HttpCode(204)
  @ApiResponse({
    status: 204,
    description: 'Status code if healthy',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiQuery({
    name: 'vertexId',
  })
  @ApiQuery({
    name: 'toRole',
    default: 'lead-developer',
  })
  @ApiQuery({
    name: 'template',
    default: 'test',
  })
  async test(@Query() query: CommunicationTestQuery) {
    // Queue the notification
    await this.communicationQueueService.queue(
      'test',
      query.vertexId,
      [{ ref: 'upstream', value: query.toRole }],
      query.template,
      {},
    );
  }
}
