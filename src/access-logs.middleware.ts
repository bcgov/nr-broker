import { Injectable, NestMiddleware } from '@nestjs/common';
import { AuditService } from './audit/audit.service';

@Injectable()
export class AccessLogsMiddleware implements NestMiddleware {
  constructor(private auditService: AuditService) {}

  use(req: any, res: any, next: () => void) {
    const startDate = new Date();
    res.on('finish', () => {
      this.auditService.recordHttpAccess(req, res, startDate, new Date());
    });
    next();
  }
}
