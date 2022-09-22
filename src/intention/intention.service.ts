import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PersistenceService } from '../persistence/persistence.service';
import { IntentionDto } from './intention.dto';

@Injectable()
export class IntentionService {
  constructor(private readonly persistenceService: PersistenceService) {}

  public test() {
    return this.persistenceService.testredis();
  }

  public create(intentionDto: IntentionDto) {
    const token = uuidv4();
    this.persistenceService.addIntention(token, intentionDto);
    return {
      token,
      ttl: 6000,
    };
  }

  public close(id: string): Promise<boolean> {
    return this.persistenceService.closeIntention(id);
  }
}
