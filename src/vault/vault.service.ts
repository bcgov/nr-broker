import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { catchError, Observable } from 'rxjs';

import { VAULT_SERVICE_WRAP_TTL } from '../constants';

export interface VaultServiceOptions {
  wrapResponse?: boolean;
}

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private vaultAddr: string;
  private brokerToken: string;

  constructor(private readonly httpService: HttpService) {
    this.brokerToken = process.env.BROKER_TOKEN;
    this.vaultAddr = process.env.VAULT_ADDR;
  }

  // /v1/<kv-mount>/* (v2)

  public getKvSubkeys(mount: string, path: string) {
    return this.httpService.get(
      `${this.vaultAddr}/v1/${mount}/subkeys/${path}`,
      this.prepareConfig(),
    );
  }

  public postKv(mount: string, path: string, data: any) {
    return this.httpService.post(
      `${this.vaultAddr}/v1/${mount}/data/${path}`,
      { data },
      this.prepareConfig(),
    );
  }

  public patchKv(mount: string, path: string, data: any) {
    const config = this.prepareConfig();
    // Content-Type header must be set for patch
    config.headers['Content-Type'] = 'application/merge-patch+json';
    return this.httpService.patch(
      `${this.vaultAddr}/v1/${mount}/data/${path}`,
      { data },
      config,
    );
  }

  // v1/auth/*

  public postAuthLogin(
    mount: string,
    roleId: string,
    secretId: string,
  ): Observable<AxiosResponse<any>> {
    return this.httpService.post(
      `${this.vaultAddr}/v1/auth/${mount}/login`,
      {
        role_id: roleId,
        secret_id: secretId,
      },
      this.prepareWrappedResponseConfig(),
    );
  }

  public postAuthMountRoleNameSecretId(
    mount: string,
    roleName: string,
    options?: VaultServiceOptions,
  ) {
    return this.httpService.post(
      `${this.vaultAddr}/v1/auth/${mount}/role/${roleName}/secret-id`,
      null,
      options?.wrapResponse
        ? this.prepareWrappedResponseConfig()
        : this.prepareConfig(),
    );
  }

  public getAuthMountRoleNameRoleId(mount: string, roleName: string) {
    return this.httpService.get(
      `${this.vaultAddr}/v1/auth/${mount}/role/${roleName}/role-id`,
      this.prepareConfig(),
    );
  }

  // v1/sys/*

  public postSysAuditHash(
    device: string,
    input: string,
  ): Observable<AxiosResponse<any>> {
    return this.httpService.post(
      `${this.vaultAddr}/v1/sys/audit-hash/${device}`,
      {
        input,
      },
      this.prepareConfig(),
    );
  }

  // v1/auth/token/*

  public getAuthTokenLookupSelf() {
    return this.httpService
      .get(`${this.vaultAddr}/v1/auth/token/lookup-self`, this.prepareConfig())
      .pipe(
        catchError((err) => {
          this.brokerToken = undefined;
          throw err;
        }),
      );
  }

  public postAuthTokenRenewSelf() {
    return this.httpService
      .post(
        `${this.vaultAddr}/v1/auth/token/renew-self`,
        null,
        this.prepareConfig(),
      )
      .pipe(
        catchError((err) => {
          this.brokerToken = undefined;
          throw err;
        }),
      );
  }

  // Private utilities

  private prepareWrappedResponseConfig(): AxiosRequestConfig<any> {
    const config = this.prepareConfig();
    config.headers['X-Vault-Wrap-TTL'] = VAULT_SERVICE_WRAP_TTL;
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
