import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This guard will issue a HTTP unauthorized if the request is not authenticated.
 * This guard should be used by Rest APIs. Caller is responsible for redirecting to login.
 * This guard should not be used with end points that browsers directly access.
 */

@Injectable()
export class BrokerOidcAuthGuard extends AuthGuard(['oidc']) {
  constructor() {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (!request.isAuthenticated()) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
