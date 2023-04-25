import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This guard will issue a HTTP redirect if the request is not authenticated.
 * This guard should be used with end points that browsers directly access.
 * This guard should not be used with Rest APIs.
 */
@Injectable()
export class BrokerOidcRedirectGuard extends AuthGuard('oidc') {
  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    await super.logIn(request);
    return result;
  }
}
