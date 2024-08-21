import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosResponse } from 'axios';
import { catchError, map, Observable, switchMap } from 'rxjs';
import {
  IS_PRIMARY_NODE,
  SHORT_ENV_CONVERSION,
  TOKEN_RENEW_RATIO,
  VAULT_SYNC_APP_AUTH_MOUNT,
  VAULT_AUDIT_DEVICE_NAME,
  VAULT_KV_APPS_MOUNT,
} from '../constants';
import { VaultService } from '../vault/vault.service';

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
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private tokenLookup: VaultTokenLookupDto | undefined;
  private renewAt: number | undefined;

  constructor(private readonly vaultService: VaultService) {
    this.lookupSelf();
  }

  public hasValidToken() {
    return !!this.vaultService.hasValidToken();
  }

  public provisionSecretId(
    projectName: string,
    appName: string,
    environment: string,
  ): Observable<any> {
    const env = SHORT_ENV_CONVERSION[environment]
      ? SHORT_ENV_CONVERSION[environment]
      : environment;
    return this.vaultService
      .postAuthMountRoleNameSecretId(
        VAULT_SYNC_APP_AUTH_MOUNT,
        `${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}`,
        { wrapResponse: true },
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
  ): Observable<any> {
    const env = SHORT_ENV_CONVERSION[environment]
      ? SHORT_ENV_CONVERSION[environment]
      : environment;
    return this.vaultService
      .postAuthMountRoleNameSecretId(
        VAULT_SYNC_APP_AUTH_MOUNT,
        `${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}`,
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

  lookupSelf() {
    if (!this.hasValidToken()) {
      return;
    }
    this.vaultService.getAuthTokenLookupSelf().subscribe({
      error: () => {
        this.logger.error('Lookup: fail');
      },
      next: (val: AxiosResponse<VaultTokenLookupDto, any>) => {
        this.logger.log(`Lookup: success`);
        this.tokenLookup = val.data;
        const baseTime = this.tokenLookup.data.last_renewal_time
          ? this.tokenLookup.data.last_renewal_time
          : this.tokenLookup.data.creation_time;
        this.renewAt =
          (baseTime +
            Math.round(
              this.tokenLookup.data.creation_ttl * TOKEN_RENEW_RATIO,
            )) *
          1000;
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  handleTokenRenewal() {
    if (
      !this.hasValidToken() ||
      this.renewAt === undefined ||
      Date.now() < this.renewAt
    ) {
      return;
    }
    if (!IS_PRIMARY_NODE) {
      // Nodes that are not the primary one should not renew
      this.lookupSelf();
      return;
    }
    this.logger.debug('Renew: start');
    this.vaultService.postAuthTokenRenewSelf().subscribe({
      error: () => {
        this.logger.error('Renew: fail');
      },
      next: (val: AxiosResponse<any, any>) => {
        this.logger.log(
          `Renew: success (duration: ${val.data.auth.lease_duration})`,
        );
        this.lookupSelf();
      },
    });
  }

  private convertUnderscoreToDash(str: string) {
    return str.replace('_', '-');
  }
}
