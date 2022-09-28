import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PersistenceService } from '../persistence/persistence.service';
import { IntentionDto } from './dto/intention.dto';
import {
  INTENTION_DEFAULT_TTL_SECONDS,
  INTENTION_MAX_TTL_SECONDS,
  INTENTION_MIN_TTL_SECONDS,
} from '../constants';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IntentionService {
  constructor(
    private readonly auditService: AuditService,
    private readonly persistenceService: PersistenceService,
  ) {}

  public async create(
    intentionDto: IntentionDto,
    ttl: number = INTENTION_DEFAULT_TTL_SECONDS,
  ) {
    const token = uuidv4();
    if (ttl < INTENTION_MIN_TTL_SECONDS || ttl > INTENTION_MAX_TTL_SECONDS) {
      throw new BadRequestException();
    }
    // Annotation intention
    intentionDto.event.start = new Date().toISOString();
    this.auditService.recordIntentionOpen(intentionDto);
    await this.persistenceService.addIntention(token, intentionDto, ttl);
    return {
      token,
      ttl,
    };
  }

  public async close(
    token: string,
    outcome: 'failure' | 'success' | 'unknown',
    reason: string | undefined,
  ): Promise<boolean> {
    const intentionDto = await this.persistenceService.getIntention(token);
    if (!intentionDto) {
      throw new NotFoundException();
    }
    this.auditService.recordIntentionClose(intentionDto, outcome, reason);
    return this.persistenceService.closeIntention(token, outcome, reason);
  }
}
