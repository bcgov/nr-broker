import {
  Req,
  Controller,
  Post,
  UseGuards,
  SetMetadata,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import {
  ACTION_PROVISION_APPROLE_SECRET_ID,
  ACTION_PROVISION_TOKEN_SELF,
  HEADER_BROKER_TOKEN,
  HEADER_VAULT_ROLE_ID,
} from '../constants';

import { Request } from 'express';
import { ProvisionService } from './provision.service';
import { VaultRoleGuard } from './vault-role.guard';
import { ProvisionGuard } from './provision.guard';
import { ActionGuard } from '../intention/action.guard';
import { ActionGuardRequest } from '../intention/action-guard-request.interface';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BrokerJwtAuthGuard } from '../auth/broker-jwt-auth.guard';

@Controller({
  path: 'provision',
  version: '1',
})
export class ProvisionController {
  constructor(private readonly provisionService: ProvisionService) {}

  @Post('approle/secret-id')
  @SetMetadata('roles', ['provision'])
  @SetMetadata('provision', [ACTION_PROVISION_APPROLE_SECRET_ID])
  @UseGuards(ActionGuard, VaultRoleGuard, ProvisionGuard)
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @ApiHeader({ name: HEADER_VAULT_ROLE_ID })
  async provisionIntentionSecretId(@Req() request: ActionGuardRequest) {
    return this.provisionService.generateSecretId(
      request,
      request.brokerIntentionDto,
      request.brokerActionDto,
    );
  }

  @Post('token/self')
  @SetMetadata('roles', ['provision'])
  @SetMetadata('provision', [ACTION_PROVISION_TOKEN_SELF])
  @UseGuards(ActionGuard, VaultRoleGuard, ProvisionGuard)
  @ApiHeader({ name: HEADER_BROKER_TOKEN, required: true })
  @ApiHeader({ name: HEADER_VAULT_ROLE_ID })
  async provisionIntentionToken(@Req() request: ActionGuardRequest) {
    const roleHeader = request.headers[HEADER_VAULT_ROLE_ID];
    const roleId = typeof roleHeader === 'string' ? roleHeader : roleHeader[0];
    const intentionDto = request.brokerIntentionDto;
    const actionDto = request.brokerActionDto;
    return this.provisionService.generateToken(
      request,
      intentionDto,
      actionDto,
      roleId,
    );
  }

  @Post('renewal')
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async provisionRenewalToken(
    @Req() request: Request,
    @Query('ttl') ttl: number | undefined,
    @Query('username') username: string,
  ) {
    return this.provisionService.renewalToken(request, ttl, username);
  }
}
