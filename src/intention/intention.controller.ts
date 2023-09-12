import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { HEADER_BROKER_TOKEN } from '../constants';
import { IntentionDtoValidationPipe } from './intention-dto-validation.pipe';
import { IntentionDto } from './dto/intention.dto';
import { IntentionService } from './intention.service';
import { BrokerJwtAuthGuard } from '../auth/broker-jwt-auth.guard';
import { ActionGuardRequest } from './action-guard-request.interface';
import { ActionGuard } from './action.guard';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { IntentionSearchQuery } from './dto/intention-search-query.dto';
import { IntentionCloseDto } from './dto/intention-close.dto';

@Controller({
  path: 'intention',
  version: '1',
})
export class IntentionController {
  constructor(private readonly intentionService: IntentionService) {}

  @Post('open')
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  openIntention(
    @Req() request: Request,
    @Body(new IntentionDtoValidationPipe())
    intentionDto: IntentionDto,
    @Query('ttl') ttl: number | undefined,
  ) {
    return this.intentionService.open(request, intentionDto, ttl);
  }

  @Post('preflight')
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  preflightIntention(
    @Req() request: Request,
    @Body(new IntentionDtoValidationPipe())
    intentionDto: IntentionDto,
    @Query('ttl') ttl: number | undefined,
  ) {
    return this.intentionService.open(request, intentionDto, ttl, true);
  }

  @Post('close')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  async closeIntention(
    @Req() request: Request,
    @Query('outcome') outcome: string | undefined,
    @Query('reason') reason: string | undefined,
  ): Promise<IntentionCloseDto> {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    if (outcome === undefined) {
      outcome = 'success';
    }
    if (
      outcome !== 'failure' &&
      outcome !== 'success' &&
      outcome !== 'unknown'
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal outcome',
        error:
          'The outcome parameter must be undefined or be one of failure, success or unknown.',
      });
    }
    const intention = await this.intentionService.close(
      request,
      token,
      outcome,
      reason,
    );
    return {
      statusCode: 200,
      message: 'Intention closed',
      audit: this.intentionService.auditUrlForIntention(intention),
    };
  }

  @Post('action/end')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @UseGuards(ActionGuard)
  async actionEnd(
    @Req() request: ActionGuardRequest,
    @Query('outcome') outcome: string | undefined,
  ) {
    if (outcome === undefined) {
      outcome = 'success';
    }
    await this.intentionService.actionLifecycle(
      request,
      request.brokerIntentionDto,
      request.brokerActionDto,
      outcome,
      'end',
    );
  }

  @Post('action/start')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @UseGuards(ActionGuard)
  async actionStart(@Req() request: ActionGuardRequest) {
    await this.intentionService.actionLifecycle(
      request,
      request.brokerIntentionDto,
      request.brokerActionDto,
      undefined,
      'start',
    );
  }

  @Post('search')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  search(@Query() query: IntentionSearchQuery) {
    return this.intentionService.search(query.where, query.offset, query.limit);
  }
}
