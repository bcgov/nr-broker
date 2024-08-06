import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { Kinesis } from '@aws-sdk/client-kinesis';
import { HttpRequest } from '@smithy/protocol-http';
import { HttpResponse } from '@smithy/protocol-http';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import {
  Subject,
  Observable,
  switchMap,
  shareReplay,
  asyncScheduler,
  map,
} from 'rxjs';
import { Buffer } from 'buffer';
import { AWS_REGION, TOKEN_RENEW_RATIO } from '../constants';

export interface AxiosResponseLike {
  data: string;
  status: number;
}

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private reload$ = new Subject<void>();
  private cache$: Observable<void>;

  private initialEnv: {
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_SESSION_TOKEN: string;
  } = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
  };

  constructor() {
    this.connectClient();
  }

  connectClient() {
    if (!this.cache$) {
      this.cache$ = this.reload$.pipe(
        switchMap(() => this.setProcessEnvForAssumedIdentity()),
        shareReplay(1),
      );
      // empty subscribe to kick it off
      this.cache$.subscribe();
      this.reload$.next(null);
    }

    return this.cache$;
  }

  public getKinesisClient(): Observable<Kinesis> {
    return this.connectClient().pipe(
      map(() => {
        return new Kinesis({
          region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
        });
      }),
    );
  }

  public async executeSignedHttpRequest(HttpRequest: HttpRequest): Promise<{
    response: HttpResponse;
  }> {
    const signedHttpRequest = await this.createSignedHttpRequest(HttpRequest);
    const nodeHttpHandler = new NodeHttpHandler();
    return nodeHttpHandler.handle(signedHttpRequest as any);
  }

  private async createSignedHttpRequest(httpRequest: HttpRequest) {
    const sigV4Init = {
      credentials: defaultProvider(),
      region: process.env.AWS_DEFAULT_REGION || 'ca-central-1',
      service: 'es',
      sha256: Sha256,
    };
    const signer = new SignatureV4(sigV4Init);
    return signer.sign(httpRequest);
  }

  public async bufferResponseAsString(
    response: HttpResponse,
  ): Promise<AxiosResponseLike> {
    return new Promise<AxiosResponseLike>((resolve) => {
      const incomingMessage = response.body;
      const body: Buffer[] = [];
      incomingMessage.on('data', (chunk: Buffer) => {
        body.push(chunk);
      });
      incomingMessage.on('end', () => {
        const data = Buffer.concat(body).toString();
        // Note: We must return to NestJs context before throwing errors
        resolve({
          status: response.statusCode,
          data,
        });
      });
      incomingMessage.on('error', () => {
        // Must never reject to allow error to be thrown in nestjs context
        resolve({
          status: 400,
          data: '',
        });
      });
    }).then((response) => {
      // Determine if response requires use to throw an error
      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Bad request',
          error: response.data,
        });
      }
      return response;
    });
  }

  private async setProcessEnvForAssumedIdentity() {
    // Reset env
    process.env.AWS_ACCESS_KEY_ID = this.initialEnv.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = this.initialEnv.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
    const stsClient1 = new STSClient({
      region: process.env.AWS_DEFAULT_REGION || AWS_REGION,
    });
    const stsAssumeRoleCommand = new AssumeRoleCommand({
      RoleArn: process.env.AWS_KINESIS_ROLE_ARN,
      RoleSessionName: 'broker',
    });
    // Send command
    const stsAssumedRole = await stsClient1.send(stsAssumeRoleCommand);
    if (stsAssumedRole && stsAssumedRole.Credentials) {
      // Overwrite the environment variables so later requests use assumed identity
      process.env.AWS_ACCESS_KEY_ID = stsAssumedRole.Credentials.AccessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY =
        stsAssumedRole.Credentials.SecretAccessKey;
      process.env.AWS_SESSION_TOKEN = stsAssumedRole.Credentials.SessionToken;
      const renewAt = Math.round(
        (new Date(stsAssumedRole.Credentials.Expiration).getTime() -
          new Date().getTime()) *
          TOKEN_RENEW_RATIO,
      );
      this.logger.log(
        `Identity assumed (valid till: ${stsAssumedRole.Credentials.Expiration}, renew in: ${renewAt})`,
      );

      // Schedule renewal
      asyncScheduler.schedule(() => {
        this.reload$.next();
      }, renewAt);
    }
  }
}
