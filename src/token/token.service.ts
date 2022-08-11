import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { map, switchMap } from 'rxjs';
import { TOKEN_SERVICE_WRAP_TTL } from '../constants';

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
    this.brokerToken = process.env.VAULT_TOKEN;
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
  ) {
    return this.httpService
      .post(
        `${this.vaultAddr}/v1/auth/vs_apps_approle/role/${projectName}_${appName}_${environment}/secret-id`,
        null,
        this.prepareWrappedResponseConfig(),
      )
      .pipe(
        map((response) => {
          return response.data.wrap_info.token;
        }),
      );
  }

  public provisionToken(
    projectName: string,
    appName: string,
    environment: string,
    roleId: string,
  ) {
    return this.httpService
      .post(
        `${this.vaultAddr}/v1/auth/vs_apps_approle/role/${projectName}_${appName}_${environment}/secret-id`,
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
              `${this.vaultAddr}/v1/auth/vs_apps_approle/login`,
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
      );
  }

  public getRoleIdForApplication(
    projectName: string,
    appName: string,
    environment: string,
  ) {
    return this.httpService
      .get(
        `${this.vaultAddr}/v1/auth/vs_apps_approle/role/${projectName}_${appName}_${environment}/role-id`,
        this.prepareConfig(),
      )
      .pipe(
        map((response) => {
          return response.data.data.role_id;
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
            (baseTime + Math.round(this.tokenLookup.data.creation_ttl * 0.75)) *
            1000;
        },
      });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  handleTokenRenewal() {
    if (
      this.brokerToken === undefined ||
      this.renewAt === undefined ||
      Date.now() < this.renewAt
    ) {
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
