import { Injectable, Logger } from '@nestjs/common';
import { KinesisService } from './kinesis.service';

@Injectable()
export class FakeKinesisService extends KinesisService {
  private readonly logger = new Logger(FakeKinesisService.name);
  public putRecord(data: any): void {
    this.logger.debug(`putRecord: ${JSON.stringify(data)}`);
  }
}
