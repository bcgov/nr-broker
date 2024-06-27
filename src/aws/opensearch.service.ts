import { Injectable } from '@nestjs/common';
import { AxiosResponseLike } from './aws.service';

@Injectable()
export abstract class OpensearchService {
  abstract search(index: string, data: any): Promise<AxiosResponseLike>;
}
