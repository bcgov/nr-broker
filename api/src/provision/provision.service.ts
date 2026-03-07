import { createSign, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { map, tap } from 'rxjs';
import { ActionUtil } from '../util/action.util';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../token/token.service';
import { JwtKeyService } from '../auth/jwt-key.service';
import { IntentionEntity } from '../intention/entity/intention.entity';
import { ActionEmbeddable } from '../intention/entity/action.embeddable';
import { BROKER_URL, MILLISECONDS_IN_SECOND } from '../constants';
import { DAYS_365_IN_SECONDS } from '../collection/dto/broker-account-token-generate-query.dto';

@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly auditService: AuditService,
    private readonly jwtKeyService: JwtKeyService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Generates and returns a wrapped secret id to provision an application with
   * @param actionDto The action information
   * @returns A wrapped secret id
   */
  public generateSecretId(
    req: Request,
    intentionDto: IntentionEntity,
    actionDto: ActionEmbeddable,
  ) {
    this.auditService.recordIntentionActionUsage(req, intentionDto, actionDto, {
      event: {
        action: 'generate-secret-id',
        category: 'configuration',
        type: 'start',
      },
    });
    return this.tokenService
      .provisionSecretId(
        actionDto.service.project,
        actionDto.service.name,
        this.actionUtil.resolveVaultEnvironment(actionDto),
      )
      .pipe(
        tap((response) => {
          this.auditService.recordIntentionActionUsage(
            req,
            intentionDto,
            actionDto,
            {
              auth: {
                client_token: response.audit.clientToken,
              },
              event: {
                action: 'generate-secret-id',
                category: 'configuration',
                type: 'creation',
              },
            },
          );
        }),
        map((response) => {
          return response.wrappedToken;
        }),
      );
  }

  /**
   * Generates a temporary token for configuration purposes.
   * @param actionDto The action information
   * @param roleId The role id
   * @returns A wrapped token
   */
  public generateToken(
    req: Request,
    intentionDto: IntentionEntity,
    actionDto: ActionEmbeddable,
    roleId: string,
  ) {
    this.auditService.recordIntentionActionUsage(req, intentionDto, actionDto, {
      event: {
        action: 'generate-token',
        category: 'configuration',
        type: 'start',
      },
    });
    return this.tokenService
      .provisionToken(
        actionDto.service.target
          ? actionDto.service.target.project
          : actionDto.service.project,
        actionDto.service.target
          ? actionDto.service.target.name
          : actionDto.service.name,
        this.actionUtil.resolveVaultEnvironment(actionDto),
        roleId,
      )
      .pipe(
        tap((response) => {
          this.auditService.recordIntentionActionUsage(
            req,
            intentionDto,
            actionDto,
            {
              auth: {
                client_token: response.audit.clientToken,
              },
              event: {
                action: 'generate-token',
                category: 'configuration',
                type: 'creation',
              },
            },
          );
        }),
        map((response) => {
          return response.wrappedToken;
        }),
      );
  }

  /**
   * Generates a JWT signed by the API for a service to authenticate with Vault.
   * @param actionDto The action information
   * @param ttlSeconds Token time-to-live in seconds
   * @returns A signed JWT string
   */
  public generateJwt(
    req: Request,
    intentionDto: IntentionEntity,
    actionDto: ActionEmbeddable,
    ttlSeconds: number = 900,
  ) {
    if (ttlSeconds > DAYS_365_IN_SECONDS) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Token TTL must not exceed ${DAYS_365_IN_SECONDS} seconds (365 days)`,
      });
    }

    this.auditService.recordIntentionActionUsage(req, intentionDto, actionDto, {
      event: {
        action: 'generate-vault-jwt',
        category: 'configuration',
        type: 'start',
      },
    });

    const signingKey = this.jwtKeyService.getSigningKey();
    if (!signingKey) {
      throw new Error('No signing key configured');
    }

    const project = actionDto.service.target
      ? actionDto.service.target.project
      : actionDto.service.project;
    const serviceName = actionDto.service.target
      ? actionDto.service.target.name
      : actionDto.service.name;
    const environment = this.actionUtil.resolveVaultEnvironment(actionDto);
    const now = Math.floor(Date.now() / MILLISECONDS_IN_SECOND);

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: signingKey.kid,
    };

    const payload = {
      iss: BROKER_URL,
      sub: `${project}/${serviceName}`,
      aud: 'vault',
      exp: now + ttlSeconds,
      iat: now,
      nbf: now,
      jti: randomUUID(),
      project,
      service: serviceName,
      environment,
    };

    const headerStr = Buffer.from(JSON.stringify(header), 'utf8').toString(
      'base64url',
    );
    const payloadStr = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const signer = createSign('RSA-SHA256');
    signer.update(headerStr + '.' + payloadStr);
    const signature = signer.sign(signingKey.privateKey, 'base64url');
    const token = `${headerStr}.${payloadStr}.${signature}`;

    this.auditService.recordIntentionActionUsage(req, intentionDto, actionDto, {
      event: {
        action: 'generate-vault-jwt',
        category: 'configuration',
        type: 'creation',
      },
    });

    return { token };
  }
}
