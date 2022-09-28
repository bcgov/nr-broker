import { Controller, Post, UseGuards, SetMetadata, Req } from '@nestjs/common';
import { Request } from 'express';
import { PersistenceService } from '../persistence/persistence.service';
import { HEADER_BROKER_TOKEN, HEADER_VAULT_ROLE_ID } from '../constants';
import { ProvisionService } from './provision.service';
import { VaultRoleGuard } from './vault-role.guard';
import { IntentionDto } from '../intention/dto/intention.dto';
import { RolesGuard } from './roles.guard';

@Controller('provision')
export class ProvisionController {
  constructor(
    private readonly provisionService: ProvisionService,
    private readonly persistenceService: PersistenceService,
  ) {}

  @Post('approle/secret-id')
  @SetMetadata('roles', ['provision', 'provision/approle/secret-id'])
  @UseGuards(VaultRoleGuard, RolesGuard)
  async provisionIntentionSecretId(@Req() request: Request) {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    const provisionDto = (await this.persistenceService.getIntention(
      token,
    )) as unknown as IntentionDto;
    return this.provisionService.generateSecretId(provisionDto);
  }

  @Post('token/self')
  @SetMetadata('roles', ['provision', 'provision/token/self'])
  @UseGuards(VaultRoleGuard, RolesGuard)
  async provisionIntentionToken(@Req() request: Request) {
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    const roleHeader = request.headers[HEADER_VAULT_ROLE_ID];
    const roleId = typeof roleHeader === 'string' ? roleHeader : roleHeader[0];
    const provisionDto = (await this.persistenceService.getIntention(
      token,
    )) as unknown as IntentionDto;
    return this.provisionService.generateToken(provisionDto, roleId);
  }
}
