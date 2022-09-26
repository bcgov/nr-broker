import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PersistenceService } from '../persistence/persistence.service';
import { IntentionDto } from './dto/intention.dto';
import {
  INTENTION_DEFAULT_TTL_SECONDS,
  INTENTION_MAX_TTL_SECONDS,
  INTENTION_MIN_TTL_SECONDS,
} from '../constants';

@Injectable()
export class IntentionService {
  constructor(private readonly persistenceService: PersistenceService) {}

  public create(
    intentionDto: IntentionDto,
    ttl: number = INTENTION_DEFAULT_TTL_SECONDS,
  ) {
    const token = uuidv4();
    if (ttl < INTENTION_MIN_TTL_SECONDS || ttl > INTENTION_MAX_TTL_SECONDS) {
      throw new BadRequestException();
    }
    this.persistenceService.addIntention(token, intentionDto, ttl);
    return {
      token,
      ttl,
    };
  }

  public close(
    id: string,
    outcome: 'failure' | 'success' | 'unknown',
    reason: string | undefined,
  ): Promise<boolean> {
    return this.persistenceService.closeIntention(id, outcome, reason);
  }
}
