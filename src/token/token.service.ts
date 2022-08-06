import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private vaultAddr: string;
  private brokerToken: string;
  private tokenValid = true;

  constructor(private readonly httpService: HttpService) {
    this.brokerToken = process.env.VAULT_TOKEN;
    this.vaultAddr = process.env.VAULT_ADDR;
    this.handleCron();
  }

  public token(): string {
    return this.brokerToken;
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
      .subscribe({
        error: () => {
          console.info('Error retreiving secret id');
        },
        next: (val: AxiosResponse<any, any>) => {
          console.info(val.data);
          return val.data.wrap_info;
        },
      });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  handleCron() {
    if (!this.tokenValid) {
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
          console.error('Renew: fail');
          this.tokenValid = false;
        },
        next: (val: AxiosResponse<any, any>) => {
          console.info(
            `Renew: success (duration: ${val.data.auth.lease_duration})`,
          );
        },
      });
  }

  private prepareWrappedResponseConfig(): AxiosRequestConfig<any> {
    const config = this.prepareConfig();
    config.headers['X-Vault-Wrap-TTL'] = 60;
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
