import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom } from 'rxjs';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { HEADER_VAULT_ROLE_ID } from '../constants';
import { ActionDto } from '../intention/dto/action.dto';

export interface RoleGuardRequest extends Request {
  brokerActionDto?: ActionDto;
}

@Injectable()
export class VaultRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokenService: TokenService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return false;
    }
    if (roles.indexOf('provision') !== -1) {
      const request = context.switchToHttp().getRequest<RoleGuardRequest>();

      const action: ActionDto = request.brokerActionDto;
      const application = action?.service?.name;
      const project = action?.service?.project;
      const environment = action?.service?.environment;

      if (
        !action ||
        !application ||
        !project ||
        !environment ||
        !request.headers[HEADER_VAULT_ROLE_ID]
      ) {
        return false;
      }

      const vaultRoleId = await lastValueFrom(
        this.tokenService.getRoleIdForApplication(
          project,
          application,
          environment,
        ),
      );
      const receivedRoleId = request.headers[HEADER_VAULT_ROLE_ID];

      if (vaultRoleId !== receivedRoleId) {
        return false;
      }

      return true;
    }
    return false;
  }
}
