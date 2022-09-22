import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom } from 'rxjs';
import { TokenService } from '../token/token.service';
import { HEADER_BROKER_TOKEN, HEADER_VAULT_ROLE_ID } from '../constants';
import { PersistenceService } from '../persistence/persistence.service';
import { Request } from 'express';

@Injectable()
export class VaultRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokenService: TokenService,
    private persistenceService: PersistenceService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return false;
    }
    if (roles.indexOf('provision') !== -1) {
      const request = context.switchToHttp().getRequest<Request>();
      const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
      const token =
        typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];

      const provisionDto = await this.persistenceService.getIntention(token);
      const application = provisionDto?.service?.name;
      const project = provisionDto?.labels?.project;
      const environment = provisionDto?.service?.environment;

      if (
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
