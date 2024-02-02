import { createHmac, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { JwtRegistryDto } from '../persistence/dto/jwt-registry.dto';
import {
  IS_PRIMARY_NODE,
  JWT_GENERATE_BLOCK_GRACE_PERIOD,
  MILLISECONDS_IN_SECOND,
} from '../constants';
import { AuditService } from '../audit/audit.service';

export class TokenCreateDTO {
  token: string;
}

@Injectable()
export class AccountService {
  constructor(
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly systemRepository: SystemRepository,
  ) {}

  async getRegisteryJwts(accountId: string): Promise<JwtRegistryDto[]> {
    return this.systemRepository.getRegisteryJwts(accountId);
  }

  async generateAccountToken(
    req: any,
    id: string,
    expirationInSeconds: number,
    creatorGuid: string,
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
    const user = await this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      creatorGuid,
    );

    if (!account || !user) {
      throw new Error();
    }

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
    await this.systemRepository.addJwtToRegister(
      id,
      payload,
      user.id.toString(),
    );
    this.auditService.recordAccountTokenLifecycle(
      req,
      payload,
      `Token generated for ${account.name} (${account.clientId}) by ${user.name} <${user.email}>`,
      'creation',
      'success',
      ['token', 'generated'],
    );

    return {
      token,
    };
  }

  async renewalAccountToken(
    req: any,
    id: string,
    creator: string,
    ttl: number,
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

    const payload = {
      client_id: account.clientId,
      exp: ISSUED_AT + ttl,
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
    await this.systemRepository.addJwtToRegister(id, payload, creator);
    this.auditService.recordAccountTokenLifecycle(
      req,
      payload,
      `Token generated for ${account.name} (${account.clientId}) with API call`,
      'creation',
      'success',
      ['token', 'generated'],
    );

    return {
      token,
    };
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
