import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly auditService: AuditService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    this.auditService.recordAuth(request, 'start', 'unknown');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    const request = context.switchToHttp().getRequest();
    if (err || !user) {
      this.auditService.recordAuth(request, 'end', 'failure');
      throw new UnauthorizedException();
    } else {
      this.auditService.recordAuth(request, 'end', 'success');
    }
    return user;
  }
}
