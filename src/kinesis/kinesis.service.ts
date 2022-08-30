import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class KinesisService {
  abstract putRecord(partitionKey: string, data: any);
}
