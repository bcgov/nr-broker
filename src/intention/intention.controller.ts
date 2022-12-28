import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { HEADER_BROKER_TOKEN } from '../constants';
import { IntentionDtoValidationPipe } from './intention-dto-validation.pipe';
import { IntentionDto } from './dto/intention.dto';
import { IntentionService } from './intention.service';
import { BrokerAuthGuard } from '../auth/broker-auth.guard';

@Controller({
  path: 'intention',
  version: '1',
})
export class IntentionController {
  constructor(private readonly intentionService: IntentionService) {}

  @Post('open')
  @UseGuards(BrokerAuthGuard)
  @ApiBasicAuth()
  @ApiBearerAuth()
  openIntention(
    @Req() request: Request,
    @Body(new IntentionDtoValidationPipe())
    intentionDto: IntentionDto,
    @Query('ttl') ttl: number | undefined,
  ) {
    return this.intentionService.open(request, intentionDto, ttl);
  }

  @Post('close')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  async closeIntention(
    @Req() request: Request,
    @Query('outcome') outcome: string | undefined,
    @Query('reason') reason: string | undefined,
  ) {
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
      throw new BadRequestException();
    }
    await this.intentionService.close(request, token, outcome, reason);
  }

  @Post('action/end')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  async actionEnd(@Req() request: Request) {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const actionToken =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    await this.intentionService.actionLifecycle(request, actionToken, 'end');
  }

  @Post('action/start')
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  async actionStart(@Req() request: Request) {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const actionToken =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    await this.intentionService.actionLifecycle(request, actionToken, 'start');
  }
}
