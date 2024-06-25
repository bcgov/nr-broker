import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpensearchService } from './opensearch.service';

@Injectable()
export class FakeOpensearchService extends OpensearchService {
  private readonly logger = new Logger(FakeOpensearchService.name);

  async search(path: string, data: any): Promise<string> {
    this.logger.verbose(`search [${path}]: ${JSON.stringify(data)}`);
    throw new ServiceUnavailableException();
  }
}
