import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeployIntentionDtoValidationPipe } from 'src/provision/deploy-intention-dto-validation.pipe';
import { DeployIntentionDto } from 'src/provision/deploy-intention.dto';
import { IntentionService } from './intention.service';

@Controller('intention')
export class IntentionController {
  constructor(private readonly intentionService: IntentionService) {}

  @Get()
  test() {
    return this.intentionService.test();
  }

  @Post()
  @UseGuards(AuthGuard('basic'))
  provisionSecretId(
    @Body(new DeployIntentionDtoValidationPipe())
    provisionDto: DeployIntentionDto,
  ) {
    return this.intentionService.create(provisionDto);
  }
}
