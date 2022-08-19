import { Injectable, Logger } from '@nestjs/common';
import { ProvisionDto } from '../provision/provision.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  recordActivity(provisionDto: ProvisionDto) {
    this.logger.debug(JSON.stringify(provisionDto));
  }
}
