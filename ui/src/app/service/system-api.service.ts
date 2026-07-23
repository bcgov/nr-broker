import { HttpClient } from '@angular/common/http';
import type { HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { filter, finalize, map, Observable, share } from 'rxjs';
import { SseClient } from 'ngx-sse-client';

import { environment } from '../../environments/environment';
import {
  JwtRegistryDto,
  TokenCreateDto,
} from './persistence/dto/jwt-registry.dto';
import { ConnectionConfigDto } from './persistence/dto/connection-config.dto';
import { HistogramSeriesDto } from './collection/dto/histogram-series.dto';
import { CollectionNames } from './persistence/dto/collection-dto-union.type';
import { SyncCollectionQuery } from './collection/dto/sync-collection-query.dto';

@Injectable({
  providedIn: 'root',
})
export class SystemApiService {
  private readonly http = inject(HttpClient);
  private sseClient = inject(SseClient);

  static accountEventObserver: Observable<any> | null = null;

  getAccountTokensArgs(accountId: string): HttpResourceRequest {
    return {
      method: 'GET',
      url: `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token`,
    };
  }

  getAccountTokens(accountId: string) {
    const args = this.getAccountTokensArgs(accountId);
    return this.http.request<JwtRegistryDto[]>(args.method ?? 'GET', args.url, {
      responseType: 'json',
      params: args.params,
      headers: args.headers as any,
      body: args.body ?? null,
    });
  }

  getAccountUsageArgs(accountId: string): HttpResourceRequest {
    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/collection/broker-account/${accountId}/usage`,
      body: {},
    };
  }

  getAccountUsage(accountId: string) {
    const args = this.getAccountUsageArgs(accountId);
    return this.http.request<HistogramSeriesDto>(args.method ?? 'POST', args.url, {
      responseType: 'json',
      body: args.body,
      params: args.params,
      headers: args.headers as any,
    });
  }

  generateAccountToken(
    accountId: string,
    expirationInSeconds: number,
    patchVaultTools: boolean,
    sync: boolean,
  ) {
    const args = this.generateAccountTokenArgs(
      accountId,
      expirationInSeconds,
      patchVaultTools,
      sync,
    );
    return this.http.request<TokenCreateDto>(args.method ?? 'POST', args.url, {
      responseType: 'json',
      body: args.body,
      params: args.params,
      headers: args.headers as any,
    });
  }

  generateAccountTokenArgs(
    accountId: string,
    expirationInSeconds: number,
    patchVaultTools: boolean,
    sync: boolean,
  ): HttpResourceRequest {
    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token`,
      body: {},
      params: {
        expiration: expirationInSeconds,
        patch: patchVaultTools,
        syncSecrets: sync,
      },
    };
  }

  revokeAccountToken(accountId: string) {
    return this.http.request<void>('DELETE', `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token`, {
      responseType: 'json',
    });
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
    const args = this.getConnectionConfigArgs();
    return this.http.request<ConnectionConfigDto[]>(args.method ?? 'GET', args.url, {
      responseType: 'json',
      params: args.params,
      headers: args.headers as any,
      body: args.body ?? null,
    });
  }

  getConnectionConfigArgs(): HttpResourceRequest {
    return {
      method: 'GET',
      url: `${environment.apiUrl}/v1/system/preference/connection`,
    };
  }

  syncCollection(
    collection: CollectionNames,
    id: string,
    syncQuery: SyncCollectionQuery,
  ) {
    const args = this.syncCollectionArgs(collection, id, syncQuery);
    return this.http.request(args.method ?? 'POST', args.url, {
      responseType: 'json',
      body: args.body,
      params: args.params,
      headers: args.headers as any,
    });
  }

  syncCollectionArgs(
    collection: CollectionNames,
    id: string,
    syncQuery: SyncCollectionQuery,
  ): HttpResourceRequest {
    const params: Record<string, string> = {};
    if (syncQuery.syncSecrets !== undefined) {
      params['syncSecrets'] = String(syncQuery.syncSecrets);
    }
    if (syncQuery.syncUsers !== undefined) {
      params['syncUsers'] = String(syncQuery.syncUsers);
    }

    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/collection/${this.toApiCollectionName(collection)}/${id}/sync`,
      body: {},
      params,
    };
  }

  private toApiCollectionName(collection: CollectionNames): string {
    switch (collection) {
      case 'brokerAccount':
        return 'broker-account';
      case 'serviceInstance':
        return 'service-instance';
      case 'openshiftProject':
        return 'openshift-project';
      default:
        return collection;
    }
  }

  userLinkGithub() {
    const args = this.userLinkGithubArgs();
    return this.http.request<any>(args.method ?? 'POST', args.url, {
      responseType: 'json',
      body: args.body,
      params: args.params,
      headers: args.headers as any,
    });
  }

  userLinkGithubArgs(): HttpResourceRequest {
    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/system/user-link/github`,
      body: {},
    };
  }
}
