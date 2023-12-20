import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom } from 'rxjs';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { HEADER_VAULT_ROLE_ID } from '../constants';
import { ActionDto } from '../intention/dto/action.dto';
import { ActionUtil } from '../util/action.util';
import { IntentionDto } from '../intention/dto/intention.dto';
import { AuditService } from '../audit/audit.service';

export interface RoleGuardRequest extends Request {
  brokerIntentionDto?: IntentionDto;
  brokerActionDto?: ActionDto;
}

/**
 * Guards paths by checking if provided role id matches the one from Vault
 * for the application. This validates that the caller knows it.
 */
@Injectable()
export class VaultRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly actionUtil: ActionUtil,
    private readonly auditService: AuditService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return false;
    }
    if (roles.indexOf('provision') !== -1) {
      const request = context.switchToHttp().getRequest<RoleGuardRequest>();

      const action: ActionDto = request.brokerActionDto;
      const intention = request.brokerIntentionDto;
      const application = action?.service?.target
        ? action?.service?.target?.name
        : action?.service?.name;
      const project = action?.service?.target
        ? action?.service?.target?.project
        : action?.service?.project;
      const environment = this.actionUtil.resolveVaultEnvironment(action);

      if (
        action &&
        application &&
        project &&
        environment &&
        !intention.requireRoleId
      ) {
        const vaultRoleId = await lastValueFrom(
          this.tokenService.getRoleIdForApplication(
            project,
            application,
            environment,
          ),
        );
        request.headers[HEADER_VAULT_ROLE_ID] = vaultRoleId;
        return true;
      }

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
        const exception = new BadRequestException({
          statusCode: 403,
          message: 'Broker forbidden access',
          error: `Request (header: ${HEADER_VAULT_ROLE_ID}) must match role id in Vault for ${project} : ${application} : ${environment}`,
        });
        this.auditService.recordIntentionActionUsage(
          request,
          intention,
          action,
          {
            event: {
              action: 'test-role-id',
              category: 'api',
              type: 'denied',
            },
          },
          exception,
        );
        throw exception;
      }

      return true;
    }
    return false;
  }
}
