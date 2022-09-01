import { AccessLogsMiddleware } from './access-logs.middleware';
import { AuditService } from './audit/audit.service';

xdescribe('AccessLogsMiddleware', () => {
  it('should be defined', () => {
    expect(new AccessLogsMiddleware(new AuditService(undefined))).toBeDefined();
  });
});
