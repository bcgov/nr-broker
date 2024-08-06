import { createHmac, randomUUID } from 'node:crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { catchError, lastValueFrom, of, switchMap } from 'rxjs';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { JwtRegistryDto } from '../persistence/dto/jwt-registry.dto';
import { BrokerJwtDto } from '../auth/broker-jwt.dto';
import {
  OPENSEARCH_INDEX_BROKER_AUDIT,
  IS_PRIMARY_NODE,
  JWT_GENERATE_BLOCK_GRACE_PERIOD,
  MILLISECONDS_IN_SECOND,
  VAULT_KV_APPS_MOUNT,
} from '../constants';
import { ActionError } from '../intention/action.error';
import { AuditService } from '../audit/audit.service';
import { OpensearchService } from '../aws/opensearch.service';
import { DateUtil, INTERVAL_HOUR_MS } from '../util/date.util';
import { BrokerAccountDto } from '../persistence/dto/broker-account.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionNameEnum } from '../persistence/dto/collection-dto-union.type';
import { ProjectDto } from '../persistence/dto/project.dto';
import { VaultService } from '../vault/vault.service';

export class TokenCreateDTO {
  token: string;
}

@Injectable()
export class AccountService {
  constructor(
    private readonly auditService: AuditService,
    private readonly opensearchService: OpensearchService,
    private readonly vaultService: VaultService,
    private readonly graphRepository: GraphRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly systemRepository: SystemRepository,
    private readonly dateUtil: DateUtil,
  ) {}

  async getRegisteryJwts(accountId: string): Promise<JwtRegistryDto[]> {
    return this.systemRepository.getRegisteryJwts(accountId);
  }

  async getUsage(
    id: string,
    hours: number,
  ): Promise<
    {
      key: string;
      doc_count: number;
    }[]
  > {
    const account = await this.collectionRepository.getCollectionById(
      'brokerAccount',
      id,
    );
    if (!account || hours <= 0) {
      throw new Error();
    }
    const now = Date.now();
    const index = this.dateUtil.computeIndex(
      OPENSEARCH_INDEX_BROKER_AUDIT,
      new Date(now - INTERVAL_HOUR_MS * hours),
      new Date(now),
    );

    return this.opensearchService
      .search(index, {
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
                    gte: `now-${hours}h`,
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
    patchVault: boolean,
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
    if (patchVault) {
      await this.addTokenToAccountServices(token, account);
    }
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
      creatorId = randomUUID().replace(/-/g, '').substring(0, 12);
    }

    return this.generateAccountToken(
      request,
      registryJwt.accountId.toString(),
      ttl,
      false,
      creatorId,
      autoRenew,
    );
  }

  async addTokenToAccountServices(token: string, account: BrokerAccountDto) {
    const downstreamServices =
      await this.graphRepository.getDownstreamVertex<ServiceDto>(
        account.vertex.toString(),
        CollectionNameEnum.service,
        3,
      );
    for (const service of downstreamServices) {
      const serviceName = service.collection.name;
      const projectDtoArr =
        await this.graphRepository.getUpstreamVertex<ProjectDto>(
          service.collection.vertex.toString(),
          CollectionNameEnum.project,
          null,
        );
      const projectName = projectDtoArr[0].collection.name;
      try {
        await this.addTokenToServiceTools(projectName, serviceName, {
          [`broker-jwt:${account.clientId}`]: token,
        });
      } catch (err) {
        // Log?
      }
    }
  }

  async addTokenToServiceTools(
    projectName: string,
    serviceName: string,
    data: any,
  ) {
    const path = `tools/${projectName}/${serviceName}`;
    return lastValueFrom(
      this.vaultService.getKvSubkeys(VAULT_KV_APPS_MOUNT, path).pipe(
        catchError((err) => {
          if (err.response.status === 404) {
            // Not found... so secret doc should be created rather than patched
            return of(null);
          }
        }),
        switchMap((subkeys) => {
          if (subkeys) {
            return this.vaultService.patchKv(VAULT_KV_APPS_MOUNT, path, data);
          } else {
            return this.vaultService.postKv(VAULT_KV_APPS_MOUNT, path, data);
          }
        }),
      ),
    );
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
