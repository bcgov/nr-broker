import { Controller, Post, UseGuards, SetMetadata, Req } from '@nestjs/common';
import { HEADER_VAULT_ROLE_ID } from '../constants';
import { ProvisionService } from './provision.service';
import { VaultRoleGuard } from './vault-role.guard';
import { ProvisionGuard } from './provision.guard';
import { ActionGuard } from './action.guard';
import { ActionGuardRequest } from './action-guard-request.interface';

@Controller({
  path: 'provision',
  version: '1',
})
export class ProvisionController {
  constructor(private readonly provisionService: ProvisionService) {}

  @Post('approle/secret-id')
  @SetMetadata('roles', ['provision'])
  @SetMetadata('provision', ['approle/secret-id'])
  @UseGuards(ActionGuard, VaultRoleGuard, ProvisionGuard)
  async provisionIntentionSecretId(@Req() request: ActionGuardRequest) {
    return this.provisionService.generateSecretId(
      request,
      request.brokerActionDto,
    );
  }

  @Post('token/self')
  @SetMetadata('roles', ['provision'])
  @SetMetadata('provision', ['token/self'])
  @UseGuards(ActionGuard, VaultRoleGuard, ProvisionGuard)
  async provisionIntentionToken(@Req() request: ActionGuardRequest) {
    const roleHeader = request.headers[HEADER_VAULT_ROLE_ID];
    const roleId = typeof roleHeader === 'string' ? roleHeader : roleHeader[0];
    const actionDto = request.brokerActionDto;
    return this.provisionService.generateToken(request, actionDto, roleId);
  }
}
