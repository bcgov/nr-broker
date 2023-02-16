import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BrokerAuthGuard extends AuthGuard(['jwt']) {
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
