import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { filter, finalize, map, Observable, share } from 'rxjs';
import { SseClient } from 'ngx-sse-client';

import { environment } from '../../environments/environment';
import { JwtRegistryDto, TokenCreateDto } from './dto/jwt-registry-rest.dto';
import { ConnectionConfigRestDto } from './dto/connection-config-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class SystemApiService {
  constructor(
    private readonly http: HttpClient,
    private sseClient: SseClient,
  ) {}

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
  ) {
    return this.http.post<TokenCreateDto>(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token?expiration=${expirationInSeconds}&patch=${patchVaultTools}`,
      {
        responseType: 'json',
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
              //console.info(
              //  `SSE request with type "${messageEvent.type}" and data "${messageEvent.data}"`,
              //);
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
    return this.http.get<ConnectionConfigRestDto[]>(
      `${environment.apiUrl}/v1/system/preference/connection`,
      {
        responseType: 'json',
      },
    );
  }

  refresh(accountId: string) {
    return this.http.post(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/refresh`,
      {},
      {
        responseType: 'json',
      },
    );
  }
}
