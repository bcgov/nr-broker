import { createSign, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Request } from 'express';
import { from, lastValueFrom, map, switchMap, tap } from 'rxjs';
import { Job } from 'bullmq';
import { ActionUtil } from '../util/action.util';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../token/token.service';
import { JwtKeyService } from '../auth/jwt-key.service';
import { IntentionEntity } from '../intention/entity/intention.entity';
import { ActionEmbeddable } from '../intention/entity/action.embeddable';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { VaultService } from '../vault/vault.service';
import { BullService } from '../bull/bull.service';
import { BROKER_URL, MILLISECONDS_IN_SECOND, MINUTE_IN_SECONDS, REDIS_QUEUES, VAULT_APPROLE_META_ACTIONS, VAULT_SYNC_APP_AUTH_MOUNT } from '../constants';

@Injectable()
export class ProvisionService implements OnModuleInit {
  private readonly logger = new Logger(ProvisionService.name);
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly auditService: AuditService,
    private readonly jwtKeyService: JwtKeyService,
    private readonly tokenService: TokenService,
    private readonly intentionRepository: IntentionRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly vaultService: VaultService,
    private readonly bullService: BullService,
  ) {}

  onModuleInit(): void {
    this.bullService.registerWorker(
      REDIS_QUEUES.VAULT_SECRET_IDS,
      async (job: Job) => {
        const cleanup = job.data as { roleName: string; accessor: string };
        await lastValueFrom(
          this.vaultService.postAuthMountRoleNameSecretIdAccessorDestroy(
            VAULT_SYNC_APP_AUTH_MOUNT,
            cleanup.roleName,
            cleanup.accessor,
          ),
        );
      },
    );
  }

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
    const service = actionDto.service.target?.name ?? actionDto.service.name;
    this.auditService.recordIntentionActionUsage(req, intentionDto, actionDto, {
      event: {
        action: VAULT_APPROLE_META_ACTIONS.GENERATE_SECRET_ID,
        category: 'configuration',
        type: 'start',
      },
    });
    const serviceLookup = actionDto.service.id
      ? this.collectionRepository.getCollectionById(
          'service',
          actionDto.service.id.toString(),
        )
      : this.collectionRepository.getCollectionByKeyValue(
          'service',
          'name',
          service,
        );
    return from(serviceLookup)
      .pipe(
        switchMap(async (serviceEntity) => {
          if (serviceEntity?.vaultConfig?.approle?.exclusiveSecretIds) {
            await this.scheduleExistingSecretIdCleanup(
              actionDto.service.project,
              actionDto.service.name,
              this.actionUtil.resolveVaultEnvironment(actionDto),
            );
          }
          return this.tokenService.provisionSecretId(
            actionDto.service.project,
            actionDto.service.name,
            this.actionUtil.resolveVaultEnvironment(actionDto),
            { intention: intentionDto.id },
          );
        }),
        switchMap((provisionSecretId) => provisionSecretId),
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
                action: VAULT_APPROLE_META_ACTIONS.GENERATE_SECRET_ID,
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
        action: VAULT_APPROLE_META_ACTIONS.GENERATE_TOKEN,
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
        { intention: intentionDto.id },
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
                action: VAULT_APPROLE_META_ACTIONS.GENERATE_TOKEN,
                category: 'configuration',
                type: 'creation',
              },
            },
          );
        }),
        tap((response) => {
          if (response.audit.tokenAccessor) {
            // Tracked in a dedicated collection so the token can be revoked when
            // the intention closes, without being serialized back to clients.
            this.intentionRepository
              .addVaultTokenAccessor(
                intentionDto.id,
                actionDto.trace.token,
                response.audit.tokenAccessor,
              )
              .catch((error) => {
                this.logger.error(
                  `Failed to record Vault token accessor: ${error instanceof Error ? error.message : String(error)}`,
                );
              });
          }
        }),
        map((response) => {
          return response.wrappedToken;
        }),
      );
  }

  private async scheduleExistingSecretIdCleanup(
    projectName: string,
    appName: string,
    environment: string,
  ): Promise<void> {
    const env = ({ production: 'prod', development: 'dev' } as Record<string, string>)[environment] ?? environment;
    const roleName = `${projectName.replace('_', '-')}_${appName.replace('_', '-')}_${env}`;
    const response = await lastValueFrom(
      this.vaultService.listAuthMountRoleNameSecretIds(
        VAULT_SYNC_APP_AUTH_MOUNT,
        roleName,
      ),
    );
    for (const secretId of response.data?.data?.keys ?? []) {
      const lookup = await lastValueFrom(
        this.vaultService.postAuthMountRoleNameSecretIdAccessorLookup(
          VAULT_SYNC_APP_AUTH_MOUNT,
          roleName,
          secretId,
        ),
      );
      const metadata = lookup.data?.data?.metadata;
      let action: unknown;
      if (typeof metadata === 'string') {
        try {
          action = JSON.parse(metadata).action;
        } catch {
          action = undefined;
        }
      } else {
        action = metadata?.action;
      }
      if (action !== VAULT_APPROLE_META_ACTIONS.GENERATE_SECRET_ID) {
        continue;
      }
      await this.bullService.enqueue(
        REDIS_QUEUES.VAULT_SECRET_IDS,
        { roleName, accessor: lookup.data.data.secret_id_accessor },
        {
          delay: 30 * 60 * 1000,
          jobId: `vault-secret-id:${roleName}:${lookup.data.data.secret_id_accessor}`,
        },
      );
    }
  }

  /**
   * Generates a JWT signed by the Broker API to authenticate the application. The token is short-lived
   * and meant to be used immediately, it is not stored or tracked by the system.
   * @param actionDto The action information
   * @param ttlSeconds Token time-to-live in seconds
   * @returns A signed JWT string
   */
  public generateJwt(
    req: Request,
    intentionDto: IntentionEntity,
    actionDto: ActionEmbeddable,
    ttlSeconds: number = 30,
  ) {
    if (ttlSeconds > MINUTE_IN_SECONDS) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Token TTL must not exceed ${MINUTE_IN_SECONDS} seconds`,
      });
    }
    if (ttlSeconds <= 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Token TTL must be greater than 0 seconds',
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
      this.logger.error('JWT signing key not configured');
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'JWT signing key not configured',
      });
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
