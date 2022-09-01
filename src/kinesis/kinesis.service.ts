import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class KinesisService {
  abstract putRecord(data: any): void;
}
