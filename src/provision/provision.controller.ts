import {
  Controller,
  Post,
  Body,
  UseGuards,
  SetMetadata,
  Req,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PersistenceService } from '../persistence/persistence.service';
import { HEADER_BROKER_TOKEN, HEADER_VAULT_ROLE_ID } from '../constants';
import { ConfigureIntentionDtoValidationPipe } from './configure-intention-dto-validation.pipe';
import { ConfigureIntentionDto } from './configure-intention.dto';
import { DeployIntentionDtoValidationPipe } from './deploy-intention-dto-validation.pipe';
import { DeployIntentionDto } from './deploy-intention.dto';
import { ProvisionGuard } from './provision.guard';
import { ProvisionService } from './provision.service';
import { VaultRoleGuard } from './vault-role.guard';

@Controller('provision')
export class ProvisionController {
  constructor(
    private readonly provisionService: ProvisionService,
    private readonly persistenceService: PersistenceService,
  ) {}

  @Post('approle/secret-id')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'), VaultRoleGuard)
  async provisionIntentionSecretId(@Req() request: Request) {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    const provisionDto = (await this.persistenceService.getIntention(
      token,
    )) as unknown as DeployIntentionDto;
    return this.provisionService.generateSecretId(provisionDto);
  }

  @Post('token/self')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'), VaultRoleGuard)
  async provisionIntentionToken(@Req() request: Request) {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    const roleHeader = request.headers[HEADER_VAULT_ROLE_ID];
    const roleId = typeof roleHeader === 'string' ? roleHeader : roleHeader[0];
    const provisionDto = (await this.persistenceService.getIntention(
      token,
    )) as unknown as ConfigureIntentionDto;
    return this.provisionService.generateToken(provisionDto, roleId);
  }

  // DEPRECATED
  @Post('secret-id')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'), ProvisionGuard)
  provisionSecretId(
    @Body(new DeployIntentionDtoValidationPipe())
    provisionDto: DeployIntentionDto,
  ) {
    return this.provisionService.generateSecretId(provisionDto);
  }

  // DEPRECATED
  @Post('token')
  @SetMetadata('roles', ['provision'])
  @UseGuards(AuthGuard('basic'), ProvisionGuard)
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
