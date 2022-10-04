import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
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
    const startDate = new Date();
    const intention = {};
    if (ttl < INTENTION_MIN_TTL_SECONDS || ttl > INTENTION_MAX_TTL_SECONDS) {
      throw new BadRequestException();
    }
    // Annotate intention event
    intentionDto.transaction = {
      ...this.createTransaction(),
      start: startDate.toISOString(),
    };
    for (const action of intentionDto.actions) {
      action.transaction = this.createTransaction();
      intention[action.id] = {
        token: action.transaction.token,
        outcome: 'success',
      };
    }
    this.auditService.recordIntentionOpen(intentionDto);
    await this.persistenceService.addIntention(intentionDto, ttl);
    return {
      intention,
      token: intentionDto.transaction.token,
      ttl,
    };
  }

  private createTransaction() {
    const token = uuidv4();
    const hasher = crypto.createHash('sha256');
    hasher.update(token);
    return {
      token,
      hash: hasher.digest('hex'),
    };
  }

  public async close(
    token: string,
    outcome: 'failure' | 'success' | 'unknown',
    reason: string | undefined,
  ): Promise<boolean> {
    const intentionDto: IntentionDto =
      await this.persistenceService.getIntention(token);
    if (!intentionDto) {
      throw new NotFoundException();
    }
    const endDate = new Date();
    const startDate = new Date(intentionDto.transaction.start);
    intentionDto.transaction.end = endDate.toISOString();
    intentionDto.transaction.duration = endDate.valueOf() - startDate.valueOf();
    intentionDto.transaction.outcome = outcome;

    this.auditService.recordIntentionClose(intentionDto, reason);
    return this.persistenceService.closeIntention(token);
  }
}
