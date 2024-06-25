import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class OpensearchService {
  abstract search(path: string, data: any): Promise<string>;
}
