import { createHmac, randomUUID } from 'node:crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { JwtRegistryDto } from '../persistence/dto/jwt-registry.dto';
import { BrokerJwtDto } from '../auth/broker-jwt.dto';
import {
  OPENSEARCH_INDEX_BROKER_AUDIT,
  IS_PRIMARY_NODE,
  JWT_GENERATE_BLOCK_GRACE_PERIOD,
  MILLISECONDS_IN_SECOND,
} from '../constants';
import { ActionError } from '../intention/action.error';
import { AuditService } from '../audit/audit.service';
import { OpensearchService } from '../aws/opensearch.service';

export class TokenCreateDTO {
  token: string;
}

@Injectable()
export class AccountService {
  constructor(
    private readonly opensearchService: OpensearchService,
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly systemRepository: SystemRepository,
  ) {}

  async getRegisteryJwts(accountId: string): Promise<JwtRegistryDto[]> {
    return this.systemRepository.getRegisteryJwts(accountId);
  }

  async getUsage(id: string): Promise<
    {
      key: string;
      doc_count: number;
    }[]
  > {
    const account = await this.collectionRepository.getCollectionById(
      'brokerAccount',
      id,
    );
    if (!account) {
      throw new Error();
    }

    return this.opensearchService
      .search(OPENSEARCH_INDEX_BROKER_AUDIT, {
        size: 0,
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  'event.action': 'intention-open',
                },
              },
              {
                match_phrase: {
                  'auth.client_id': account.clientId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1h',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          response_codes: {
            terms: {
              field: 'event.outcome',
              size: 4,
            },
          },
        },
      })
      .then((response) => {
        const result = JSON.parse(response.data);
        if (!result?.aggregations?.response_codes?.buckets) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'No buckets found',
          });
        }
        return result.aggregations.response_codes.buckets.reduce(
          (pv, cv) => {
            return {
              ...pv,
              [cv.key]: cv.doc_count,
            };
          },
          { success: 0, unknown: 0, failure: 0 },
        );
      });
  }

  async generateAccountToken(
    req: any,
    id: string,
    expirationInSeconds: number,
    creatorGuid: string,
    autoRenew: boolean,
  ): Promise<TokenCreateDTO> {
    const hmac = createHmac('sha256', process.env['JWT_SECRET']);
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    const ISSUED_AT = Math.floor(Date.now() / MILLISECONDS_IN_SECOND);

    const account = await this.collectionRepository.getCollectionById(
      'brokerAccount',
      id,
    );
    if (!account) {
      throw new Error();
    }

    const user = await this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      creatorGuid,
    );

    if (!user && !autoRenew) {
      throw new Error();
    }

    const creatorId = user ? user.id.toString() : creatorGuid;
    const message = autoRenew
      ? `Token renewed for ${account.name} (${account.clientId}) by API call`
      : `Token generated for ${account.name} (${account.clientId}) by ${user.name} <${user.email}>`;

    const payload = {
      client_id: account.clientId,
      exp: ISSUED_AT + expirationInSeconds,
      iat: ISSUED_AT,
      nbf: ISSUED_AT,
      jti: randomUUID(),
      sub: account.email,
    };
    const headerStr = Buffer.from(JSON.stringify(header), 'utf8').toString(
      'base64url',
    );

    const payloadStr = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    hmac.update(headerStr + '.' + payloadStr);

    const token = `${headerStr}.${payloadStr}.${hmac.digest('base64url')}`;
    await this.systemRepository.addJwtToRegister(id, payload, creatorId);
    this.auditService.recordAccountTokenLifecycle(
      req,
      payload,
      message,
      'creation',
      'success',
      ['token', 'generated'],
    );

    return {
      token,
    };
  }

  async renewToken(
    request: Request,
    ttl: number,
    autoRenew: boolean,
  ): Promise<TokenCreateDTO> {
    const actionFailures: ActionError[] = [];
    try {
      const brokerJwt = plainToInstance(BrokerJwtDto, request.user);
      const registryJwt = await this.systemRepository.getRegisteryJwtByClaimJti(
        brokerJwt.jti,
      );
      if (registryJwt && registryJwt.blocked) {
        // JWT should by in block list anyway
        throw new BadRequestException({
          statusCode: 400,
          message: 'Authorization failed',
          error: actionFailures,
        });
      }
      const user = await this.collectionRepository.getCollectionById(
        'user',
        registryJwt.createdUserId.toString(),
      );

      let creatorId: string;
      if (user) creatorId = user.guid;
      else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        creatorId = randomUUID().replace(/-/g, '').substring(0, 12);
      }

      return this.generateAccountToken(
        request,
        registryJwt.accountId.toString(),
        ttl,
        creatorId,
        autoRenew,
      );
    } catch (e) {
      throw e;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runJwtLifecycle() {
    const CURRENT_TIME_MS = Date.now();
    const CURRENT_TIME_S = Math.floor(CURRENT_TIME_MS / MILLISECONDS_IN_SECOND);

    if (!IS_PRIMARY_NODE) {
      // Nodes that are not the primary one should not run lifecycle
      return;
    }

    const expiredJwtArr =
      await this.systemRepository.findExpiredRegistryJwts(CURRENT_TIME_S);
    for (const expiredJwt of expiredJwtArr) {
      await this.systemRepository.deleteRegistryJwt(expiredJwt);
    }

    const groupedAccounts =
      await this.systemRepository.groupRegistryByAccountId();

    for (const account of groupedAccounts) {
      const count = account.jti.length;
      const expireTime =
        account.createdAt[count - 1].valueOf() +
        JWT_GENERATE_BLOCK_GRACE_PERIOD;
      const accountCollection =
        await this.collectionRepository.getCollectionById(
          'brokerAccount',
          account._id.accountId.toString(),
        );
      for (let i = 0; i < count; i++) {
        if (account.blocked[i]) {
          continue;
        }

        if (!accountCollection) {
          // Block all if the account was deleted.
          await this.systemRepository.blockJwtByJti(account.jti[i]);
          continue;
        }

        if (i <= count - 3) {
          await this.systemRepository.blockJwtByJti(account.jti[i]);
        } else if (i == count - 2 && expireTime < CURRENT_TIME_MS) {
          await this.systemRepository.blockJwtByJti(account.jti[i]);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runJwtExpirationNotification() {
    const CURRENT_TIME_MS = Date.now();
    const CURRENT_TIME_S = Math.floor(CURRENT_TIME_MS / MILLISECONDS_IN_SECOND);

    if (!IS_PRIMARY_NODE) {
      // Nodes that are not the primary one should not run lifecycle
      return;
    }

    const expiredJwtArr = await this.systemRepository.findExpiredRegistryJwts(
      CURRENT_TIME_S + 60 * 60 * 24 * 7,
    );

    for (const expiredJwt of expiredJwtArr) {
      if (expiredJwt.blocked) {
        continue;
      }
      const account = await this.collectionRepository.getCollectionById(
        'brokerAccount',
        expiredJwt.accountId.toString(),
      );

      this.auditService.recordAccountTokenLifecycle(
        null,
        expiredJwt.claims,
        `Token will expire soon for ${account.name} (${expiredJwt.claims.client_id})`,
        'info',
        'success',
        ['token', 'warning', 'expiry'],
      );
    }
  }
}
