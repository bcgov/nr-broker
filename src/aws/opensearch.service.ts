import { Injectable } from '@nestjs/common';
import { AxiosResponseLike } from './aws.service';

@Injectable()
export abstract class OpensearchService {
  abstract search(path: string, data: any): Promise<AxiosResponseLike>;
}
