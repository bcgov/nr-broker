import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from '../audit/audit.service';

/**
 * This guard will issue a HTTP unauthorized if the request is not authenticated.
 * This guard should be used by Rest APIs. Caller is responsible for redirecting to login.
 * This guard should not be used with end points that browsers directly access.
 */

@Injectable()
export class BrokerJwtAuthGuard extends AuthGuard(['jwt']) {
  constructor(private readonly auditService: AuditService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    this.auditService.recordAuth(request, null, 'start', 'unknown');
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    const request = context.switchToHttp().getRequest();

    if (err || !user) {
      this.auditService.recordAuth(request, user, 'end', 'failure');
      if (err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException();
    } else {
      this.auditService.recordAuth(request, user, 'end', 'success');
    }
    return user;
  }
}
