import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosResponse } from 'axios';
import { catchError, map, Observable, switchMap } from 'rxjs';
import { MikroORM } from '@mikro-orm/core';
import { CreateRequestContext } from '@mikro-orm/decorators/legacy';

import {
  BULL_LEADER_JOBS,
  SHORT_ENV_CONVERSION,
  TOKEN_RENEW_RATIO,
  VAULT_SYNC_APP_AUTH_MOUNT,
  VAULT_APPROLE_META_ACTIONS,
  VAULT_AUDIT_DEVICE_NAME,
  VAULT_KV_APPS_MOUNT,
  VAULT_SERVICE_WRAP_TTL,
} from '../constants';
import { VaultService } from '../vault/vault.service';
import { BullService } from '../bull/bull.service';

interface VaultTokenLookupDto {
  data: {
    accessor: string;
    creation_time: number;
    creation_ttl: number;
    display_name: string;
    entity_id: string;
    expire_time: string;
    explicit_max_ttl: number;
    id: string;
    identity_policies: Array<string>;
    issue_time: string;
    last_renewal: string | undefined;
    last_renewal_time: number | undefined;
    num_uses: 0;
    orphan: boolean;
    path: string;
    policies: Array<string>;
    renewable: boolean;
    ttl: number;
  };
}

@Injectable()
export class TokenService implements OnModuleInit {
  private readonly logger = new Logger(TokenService.name);
  private tokenLookup: VaultTokenLookupDto | undefined;
  private renewAt: number | undefined;

  constructor(
    private readonly bullService: BullService,
    private readonly vaultService: VaultService,
    // used by: @CreateRequestContext()
    private readonly orm: MikroORM,
  ) {}

  /**
   * Schedule the recurring token refresh on the BullMQ leader queue and kick off
   * the initial lookup once the module is initialized, after dependency injection
   * and before the server starts listening. BullMQ claims the repeatable job for
   * exactly one node per tick, so renewal runs on a single node regardless of
   * how many replicas or the standalone worker are running.
   */
  onModuleInit(): void {
    this.bullService.registerLeaderJob(
      BULL_LEADER_JOBS.TOKEN_RENEWAL,
      CronExpression.EVERY_MINUTE,
      () => this.handleTokenRenewal(),
    );
  }

  public hasValidToken() {
    return !!this.vaultService.hasValidToken();
  }

  public provisionSecretId(
    projectName: string,
    appName: string,
    environment: string,
    metadata: Record<string, string | number | boolean> = {},
  ): Observable<any> {
    const env = SHORT_ENV_CONVERSION[environment]
      ? SHORT_ENV_CONVERSION[environment]
      : environment;
    return this.vaultService
      .postAuthMountRoleNameSecretId(
        VAULT_SYNC_APP_AUTH_MOUNT,
        `${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}`,
        {
          wrapResponse: true,
          metadata: {
            action: VAULT_APPROLE_META_ACTIONS.GENERATE_SECRET_ID,
            service: appName,
            env: environment,
            ...metadata,
          },
        },
      )
      .pipe(
        map((response) => {
          return response.data;
        }),
        switchMap((wrappedToken) => {
          return this.vaultService
            .postSysAuditHash(
              VAULT_AUDIT_DEVICE_NAME,
              wrappedToken.wrap_info.token,
            )
            .pipe(
              map((auditResponse) => {
                return {
                  audit: {
                    clientToken: auditResponse.data.data.hash,
                  },
                  wrappedToken,
                };
              }),
            );
        }),
      );
  }

  public provisionToken(
    projectName: string,
    appName: string,
    environment: string,
    roleId: string,
    metadata: Record<string, string | number | boolean> = {},
  ): Observable<any> {
    const env = SHORT_ENV_CONVERSION[environment]
      ? SHORT_ENV_CONVERSION[environment]
      : environment;
    return this.vaultService
      .postAuthMountRoleNameSecretId(
        VAULT_SYNC_APP_AUTH_MOUNT,
        `${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}`,
        {
          secretIdNumUses: 1,
          secretIdTtl: VAULT_SERVICE_WRAP_TTL,
          tokenExplicitMaxTtl: 5,
          metadata: {
            action: VAULT_APPROLE_META_ACTIONS.GENERATE_TOKEN,
            service: appName,
            env: environment,
            ...metadata,
          },
        },
      )
      .pipe(
        map((response) => {
          return response.data.data.secret_id;
        }),
        switchMap((secretId) => {
          return this.vaultService
            .postAuthLogin(VAULT_SYNC_APP_AUTH_MOUNT, roleId, secretId)
            .pipe(
              map((response) => {
                return response.data;
              }),
            );
        }),
        switchMap((wrappedToken) => {
          return this.vaultService
            .postSysAuditHash(
              VAULT_AUDIT_DEVICE_NAME,
              wrappedToken.wrap_info.token,
            )
            .pipe(
              map((auditResponse) => {
                return {
                  audit: {
                    clientToken: auditResponse.data.data.hash,
                    // Accessor for the wrapped login token; lets Broker revoke the
                    // token later (e.g. on intention close) without ever seeing it.
                    tokenAccessor: wrappedToken.wrap_info.wrapped_accessor,
                  },
                  wrappedToken,
                };
              }),
            );
        }),
      );
  }

  public getAppRoleInfoForApplication(
    projectName: string,
    appName: string,
    environment: string,
  ) {
    const env = SHORT_ENV_CONVERSION[environment]
      ? SHORT_ENV_CONVERSION[environment]
      : environment;
    const roleName = `${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}`;
    return this.vaultService
      .getAuthMountRoleNameRoleId(VAULT_SYNC_APP_AUTH_MOUNT, roleName)
      .pipe(
        map((response) => {
          return {
            id: response.data.data.role_id,
            kvUiPath: `ui/vault/secrets/${VAULT_KV_APPS_MOUNT}/kv/list/${env}/${projectName}/${appName}`,
            kvApiDataPath: `${VAULT_KV_APPS_MOUNT}/data/${env}/${projectName}/${appName}`,
            kvApiMetadataPath: `${VAULT_KV_APPS_MOUNT}/metadata/${env}/${projectName}/${appName}`,
            mount: VAULT_SYNC_APP_AUTH_MOUNT,
            name: roleName,
          };
        }),
        catchError((err) => {
          if (err.response.status === 403) {
            throw new BadRequestException({
              statusCode: 403,
              message: 'Vault forbidden access',
              error: `Check broker access to ${projectName} : ${appName}`,
            });
          } else if (err.response.status === 404) {
            throw new NotFoundException({
              statusCode: 404,
              message: 'Not Found',
              error: `Check approle exists for ${projectName} : ${appName} : ${environment}`,
            });
          } else {
            throw err;
          }
        }),
      );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  lookupSelf() {
    if (!this.hasValidToken()) {
      return;
    }
    if (this.renewAt !== undefined && Date.now() < this.renewAt) {
      // Do not need to lookup the token if it is not yet time to renew.
      // This avoids unnecessary Vault calls and log spam.
      return;
    }
    this.vaultService.getAuthTokenLookupSelf().subscribe({
      error: (err) => {
        this.logger.error(`Lookup: fail ${this.describeVaultError(err)}`);
      },
      next: (val: AxiosResponse<VaultTokenLookupDto, any>) => {
        this.logger.log('Lookup: success');
        this.tokenLookup = val.data;
        const baseTime = this.tokenLookup.data.last_renewal_time
          ? this.tokenLookup.data.last_renewal_time
          : this.tokenLookup.data.creation_time;
        const renewAt = (baseTime +
          Math.round(
            this.tokenLookup.data.creation_ttl * TOKEN_RENEW_RATIO,
          )) *
          1000;
        if (this.renewAt !== renewAt) {
          this.logger.log(
            `Renewal deadline updated: ${new Date(renewAt).toISOString()}`,
          );
        }
        this.renewAt = renewAt;
      },
    });
  }

  /**
   * Leader-queue handler for the recurring Vault token refresh. BullMQ fires
   * this once per minute on a single node.
   */
  @CreateRequestContext()
  private async handleTokenRenewal() {
    try {
      if (!this.hasValidToken()) {
        return;
      }
      if (this.renewAt === undefined) {
        // The renewal deadline has not been computed yet, e.g. the initial
        // lookup at startup failed or raced Vault. Recompute it this tick so
        // the next tick can renew, instead of giving up forever.
        this.lookupSelf();
        return;
      }
      if (Date.now() < this.renewAt) {
        return;
      }

      this.logger.debug('Renew: start');
      this.vaultService.postAuthTokenRenewSelf().subscribe({
        error: (err) => {
          this.logger.error(`Renew: fail ${this.describeVaultError(err)}`);
        },
        next: (val: AxiosResponse<any, any>) => {
          this.logger.log(
            `Renew: success (duration: ${val.data.auth.lease_duration})`,
          );
          this.lookupSelf();
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle token renewal: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
    * Summarize a Vault HTTP error for logging. The observable error handlers
    * previously logged only "fail", hiding the actual status, message and
    * response body and making the renewal failure undiagnosable.
    */
  private describeVaultError(err: any): string {
    const parts: string[] = [];
    const status = err?.response?.status;
    if (status) {
      parts.push(`status ${status}`);
    }
    const message = err?.response?.data?.message ?? err?.message;
    if (message) {
      parts.push(`message "${message}"`);
    }
    if (err?.code) {
      parts.push(`code ${err.code}`);
    }
    if (parts.length === 0) {
      return String(err);
    }
    return parts.join(', ');
  }

  private convertUnderscoreToDash(str: string) {
    return str.replace('_', '-');
  }
}
