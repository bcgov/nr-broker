import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom } from 'rxjs';
import { TokenService } from 'src/token/token.service';
import { ProvisionDto } from './provision.dto';

const HEADER_VAULT_ROLE_ID = 'x-vault-role-id';

@Injectable()
export class ProvisionGuard implements CanActivate {
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
      const request = context.switchToHttp().getRequest<Request>();
      // Converted by middleware
      const provision: ProvisionDto = request.body as unknown as ProvisionDto;
      const application = provision?.service?.name;
      const project = provision?.labels?.project;
      const environment = provision?.service?.environment;
      console.log(request.headers);
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
