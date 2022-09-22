import {
  Body,
  Controller,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HEADER_BROKER_TOKEN } from '../constants';
import { IntentionDtoValidationPipe } from './intention-dto-validation.pipe';
import { IntentionDto } from './intention.dto';
import { IntentionService } from './intention.service';

@Controller('intention')
export class IntentionController {
  constructor(private readonly intentionService: IntentionService) {}

  @Post()
  @UseGuards(AuthGuard('basic'))
  registerIntention(
    @Body(new IntentionDtoValidationPipe())
    intentionDto: IntentionDto,
  ) {
    return this.intentionService.create(intentionDto);
  }

  @Post('finalize')
  @UseGuards(AuthGuard('basic'))
  async finalizeIntention(@Req() request: Request) {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    const result = await this.intentionService.finalize(token);
    if (!result) {
      throw new NotFoundException('Intention not found');
    }
  }
}
