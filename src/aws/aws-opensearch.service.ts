import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpRequest } from '@smithy/protocol-http';
import { OpensearchService } from './opensearch.service';
import { AwsService } from './aws.service';
import { AWS_OPENSEARCH_HOST } from '../constants';

@Injectable()
export class AwsOpensearchService extends OpensearchService {
  private readonly logger = new Logger(AwsOpensearchService.name);

  constructor(private readonly aws: AwsService) {
    super();
  }

  async search(path: string, body: any) {
    const request = await this.aws.executeSignedHttpRequest(
      new HttpRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: AWS_OPENSEARCH_HOST,
        },
        hostname: AWS_OPENSEARCH_HOST,
        path: `/${path}/_search`,
        body: JSON.stringify(body),
        query: {
          format: 'json',
        },
      }),
    );
    return this.aws.bufferResponseAsString(request.response);
  }
}
