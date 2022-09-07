import { Injectable } from '@nestjs/common';
import { DeployIntentionDto } from 'src/provision/deploy-intention.dto';

@Injectable()
export class IntentionService {
  public create(provisionDto: DeployIntentionDto) {
    console.log(provisionDto);
    return '';
  }
}
