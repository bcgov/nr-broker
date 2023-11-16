import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { catchError, map, Observable, switchMap } from 'rxjs';
import {
  IS_PRIMARY_NODE,
  SHORT_ENV_CONVERSION,
  TOKEN_RENEW_RATIO,
  TOKEN_SERVICE_WRAP_TTL,
  VAULT_SYNC_APP_AUTH_MOUNT,
  VAULT_AUDIT_DEVICE_NAME,
} from '../constants';

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
  private vaultAddr: string;
  private brokerToken: string;
  private tokenLookup: VaultTokenLookupDto | undefined;
  private renewAt: number | undefined;

  constructor(private readonly httpService: HttpService) {
    this.brokerToken = process.env.BROKER_TOKEN;
    this.vaultAddr = process.env.VAULT_ADDR;
    this.lookupSelf();
  }

  public hasValidToken() {
    return !!this.brokerToken;
  }

  public provisionSecretId(
    projectName: string,
    appName: string,
    environment: string,
  ): Observable<any> {
    const env = SHORT_ENV_CONVERSION[environment]
      ? SHORT_ENV_CONVERSION[environment]
      : environment;
    return this.httpService
      .post(
        // eslint-disable-next-line prettier/prettier
        `${this.vaultAddr}/v1/auth/${VAULT_SYNC_APP_AUTH_MOUNT}/role/${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}/secret-id`,
        null,
        this.prepareWrappedResponseConfig(),
      )
      .pipe(
        map((response) => {
          return response.data;
        }),
        switchMap((wrappedToken) => {
          return this.httpService
            .post(
              `${this.vaultAddr}/v1/sys/audit-hash/file`,
              {
                input: wrappedToken.wrap_info.token,
              },
              this.prepareConfig(),
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
    return this.httpService
      .post(
        // eslint-disable-next-line prettier/prettier
        `${this.vaultAddr}/v1/auth/${VAULT_SYNC_APP_AUTH_MOUNT}/role/${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}/secret-id`,
        null,
        this.prepareConfig(),
      )
      .pipe(
        map((response) => {
          return response.data.data.secret_id;
        }),
        switchMap((secretId) => {
          return this.httpService
            .post(
              `${this.vaultAddr}/v1/auth/${VAULT_SYNC_APP_AUTH_MOUNT}/login`,
              {
                role_id: roleId,
                secret_id: secretId,
              },
              this.prepareWrappedResponseConfig(),
            )
            .pipe(
              map((response) => {
                return response.data;
              }),
            );
        }),
        switchMap((wrappedToken) => {
          return this.httpService
            .post(
              `${this.vaultAddr}/v1/sys/audit-hash/${VAULT_AUDIT_DEVICE_NAME}`,
              {
                input: wrappedToken.wrap_info.token,
              },
              this.prepareConfig(),
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

  public getRoleIdForApplication(
    projectName: string,
    appName: string,
    environment: string,
  ) {
    const env = SHORT_ENV_CONVERSION[environment]
      ? SHORT_ENV_CONVERSION[environment]
      : environment;
    return this.httpService
      .get(
        // eslint-disable-next-line prettier/prettier
        `${this.vaultAddr}/v1/auth/${VAULT_SYNC_APP_AUTH_MOUNT}/role/${this.convertUnderscoreToDash(projectName)}_${this.convertUnderscoreToDash(appName)}_${env}/role-id`,
        this.prepareConfig(),
      )
      .pipe(
        map((response) => {
          return response.data.data.role_id;
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
    if (!this.brokerToken) {
      return;
    }
    this.httpService
      .get(`${this.vaultAddr}/v1/auth/token/lookup-self`, this.prepareConfig())
      .subscribe({
        error: () => {
          this.logger.error('Lookup: fail');
          this.brokerToken = undefined;
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
      this.brokerToken === undefined ||
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
    this.httpService
      .post(
        `${this.vaultAddr}/v1/auth/token/renew-self`,
        null,
        this.prepareConfig(),
      )
      .subscribe({
        error: () => {
          this.logger.error('Renew: fail');
          this.brokerToken = undefined;
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

  private prepareWrappedResponseConfig(): AxiosRequestConfig<any> {
    const config = this.prepareConfig();
    config.headers['X-Vault-Wrap-TTL'] = TOKEN_SERVICE_WRAP_TTL;
    return config;
  }

  private prepareConfig(): AxiosRequestConfig<any> {
    return {
      headers: {
        'X-Vault-Token': this.brokerToken,
      },
    };
  }
}
