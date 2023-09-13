import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BrokerJwtAuthGuard } from './broker-jwt-auth.guard';
import { Request } from 'express';
import { BrokerOidcAuthGuard } from './broker-oidc-auth.guard';

/**
 * This guard combines JWT and OIDC authentication. If the request has an authorization
 * header it will be evaluated as a JWT.
 */

@Injectable()
export class BrokerCombinedAuthGuard extends AuthGuard(['jwt', 'oidc']) {
  constructor(
    private readonly oidcAuthGuard: BrokerOidcAuthGuard,
    private readonly jwtAuthGuard: BrokerJwtAuthGuard,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.headers.authorization) {
      return this.jwtAuthGuard.canActivate(context);
    } else {
      return this.oidcAuthGuard.canActivate(context);
    }
  }

  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    const request = context.switchToHttp().getRequest();

    if (request.headers.authorization) {
      return this.jwtAuthGuard.handleRequest(err, user, info, context, status);
    } else {
      return this.oidcAuthGuard.handleRequest(err, user, info, context, status);
    }
  }
}
