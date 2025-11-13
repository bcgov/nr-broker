import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { filter, finalize, map, Observable, share } from 'rxjs';
import { SseClient } from 'ngx-sse-client';

import { environment } from '../../environments/environment';
import {
  JwtRegistryDto,
  TokenCreateDto,
} from './persistence/dto/jwt-registry.dto';
import { ConnectionConfigDto } from './persistence/dto/connection-config.dto';

@Injectable({
  providedIn: 'root',
})
export class SystemApiService {
  private readonly http = inject(HttpClient);
  private sseClient = inject(SseClient);

  static accountEventObserver: Observable<any> | null = null;

  getAccountTokens(accountId: string) {
    return this.http.get<JwtRegistryDto[]>(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token`,
      {
        responseType: 'json',
      },
    );
  }

  getAccountUsage(accountId: string) {
    return this.http.post<{
      success: number;
      unknown: number;
      failure: number;
    }>(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/usage`,
      {
        responseType: 'json',
      },
    );
  }

  generateAccountToken(
    accountId: string,
    expirationInSeconds: number,
    patchVaultTools: boolean,
    sync: boolean,
  ) {
    return this.http.post<TokenCreateDto>(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token`,
      {},
      {
        responseType: 'json',
        params: {
          expiration: expirationInSeconds,
          patch: patchVaultTools,
          syncSecrets: sync,
        },
      },
    );
  }

  createAccountTokenEventSource(): Observable<any> {
    if (!SystemApiService.accountEventObserver) {
      SystemApiService.accountEventObserver = this.sseClient
        .stream(`${environment.apiUrl}/v1/collection/broker-account/events`)
        .pipe(
          filter((event) => {
            if (event.type === 'error') {
              const errorEvent = event as ErrorEvent;
              if (errorEvent.error) {
                console.error(errorEvent.error, errorEvent.message);
              }
              return false;
            }
            return true;
          }),
          map((event) => {
            if (event.type !== 'error') {
              const messageEvent = event as MessageEvent;
              // console.info(
              //  `SSE request with type "${messageEvent.type}" and data "${messageEvent.data}"`,
              // );
              return JSON.parse(messageEvent.data);
            }
          }),
          finalize(() => {
            SystemApiService.accountEventObserver = null;
          }),
          share(),
        );
    }
    return SystemApiService.accountEventObserver;
  }

  getConnectionConfig() {
    return this.http.get<ConnectionConfigDto[]>(
      `${environment.apiUrl}/v1/system/preference/connection`,
      {
        responseType: 'json',
      },
    );
  }

  brokerAccountRefresh(accountId: string) {
    return this.http.post(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/refresh`,
      {},
      {
        responseType: 'json',
      },
    );
  }

  repositoryRefresh(
    repositoryId: string,
    syncSecrets: boolean,
    syncUsers: boolean,
  ) {
    return this.http.post(
      `${environment.apiUrl}/v1/collection/repository/${repositoryId}/refresh`,
      {},
      {
        responseType: 'json',
        params: {
          syncSecrets,
          syncUsers,
        },
      },
    );
  }

  userLinkGithub() {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/system/user-link/github`,
      {},
      {
        responseType: 'json',
      },
    );
  }
}
