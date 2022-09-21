import { Injectable } from '@nestjs/common';
import { DeployIntentionDto } from '../provision/deploy-intention.dto';
import { PersistenceService } from '../persistence/persistence.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IntentionService {
  constructor(private readonly persistenceService: PersistenceService) {}

  public test() {
    return this.persistenceService.testredis();
  }

  public create(provisionDto: DeployIntentionDto) {
    const token = uuidv4();
    console.log(provisionDto);
    return {
      token,
      ttl: 6000,
    };
  }
}
