import {
  Controller,
  Post,
  Body,
  UseGuards,
  SetMetadata,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { HEADER_VAULT_ROLE_ID } from '../constants';
import { ConfigureIntentionDtoValidationPipe } from './configure-intention-dto-validation.pipe';
import { ConfigureIntentionDto } from './configure-intention.dto';
import { DeployIntentionDtoValidationPipe } from './deploy-intention-dto-validation.pipe';
import { DeployIntentionDto } from './deploy-intention.dto';
import { ProvisionGuard } from './provision.guard';
import { ProvisionService } from './provision.service';

@Controller('provision')
@UseGuards(ProvisionGuard)
export class ProvisionController {
  constructor(private readonly provisionService: ProvisionService) {}

  @Post('secret-id')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'))
  provisionSecretId(
    @Body(new DeployIntentionDtoValidationPipe())
    provisionDto: DeployIntentionDto,
  ) {
    return this.provisionService.generateSecretId(provisionDto);
  }

  @Post('token')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'))
  provisionToken(
    @Body(new ConfigureIntentionDtoValidationPipe())
    provisionDto: ConfigureIntentionDto,
    @Req() request: Request,
  ) {
    const roleHeader = request.headers[HEADER_VAULT_ROLE_ID];
    const roleId = typeof roleHeader === 'string' ? roleHeader : roleHeader[0];
    return this.provisionService.generateToken(provisionDto, roleId);
  }
}
