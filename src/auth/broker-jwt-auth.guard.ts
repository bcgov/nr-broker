import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from '../audit/audit.service';
import { plainToInstance } from 'class-transformer';
import { BrokerJwtDto } from './broker-jwt.dto';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { PersistenceUtilService } from '../persistence/persistence-util.service';

/**
 * This guard will issue a HTTP unauthorized if the request is not authenticated.
 * This guard should be used by Rest APIs. Caller is responsible for redirecting to login.
 * This guard should not be used with end points that browsers directly access.
 */

@Injectable()
export class BrokerJwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly auditService: AuditService,
    private readonly persistenceUtilService: PersistenceUtilService,
    private readonly systemRepository: SystemRepository,
    private reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.auditService.recordAuth(request, null, 'start', 'unknown');

    try {
      let canActivate = (await super.canActivate(context)) as boolean;
      const user = request.user;

      if (user) {
        const accountPermissionCheck = this.reflector.get<string>(
          'account-permission',
          context.getHandler(),
        );
        if (accountPermissionCheck) {
          const account = plainToInstance(BrokerJwtDto, user);
          const registryJwt =
            await this.systemRepository.getRegisteryJwtByClaimJti(account.jti);
          if (!registryJwt) {
            throw new UnauthorizedException();
          }

          const brokerAccount = await this.persistenceUtilService.getAccount(
            registryJwt,
          );
          if (!brokerAccount) {
            throw new UnauthorizedException();
          }
          canActivate = canActivate && brokerAccount[accountPermissionCheck];
        }
      }
      this.auditService.recordAuth(
        request,
        user,
        'end',
        canActivate ? 'success' : 'failure',
      );
      return canActivate;
    } catch (e) {
      this.auditService.recordAuth(request, request.user, 'end', 'failure');
      throw e;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    if (err || !user) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException();
    }
    return user;
  }
}
