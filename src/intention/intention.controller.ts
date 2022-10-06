import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { HEADER_BROKER_TOKEN } from '../constants';
import { IntentionDtoValidationPipe } from './intention-dto-validation.pipe';
import { IntentionDto } from './dto/intention.dto';
import { IntentionService } from './intention.service';

@Controller({
  path: 'intention',
  version: '1',
})
export class IntentionController {
  constructor(private readonly intentionService: IntentionService) {}

  @Post('open')
  @UseGuards(AuthGuard('basic'))
  registerIntention(
    @Req() request: Request,
    @Body(new IntentionDtoValidationPipe())
    intentionDto: IntentionDto,
    @Query('ttl') ttl: number | undefined,
  ) {
    return this.intentionService.create(request, intentionDto, ttl);
  }

  @Post('close')
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
}
