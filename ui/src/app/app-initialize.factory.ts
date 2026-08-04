import { HttpClient } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { Observable, catchError, forkJoin, tap } from 'rxjs';
import { environment } from '../environments/environment';
import {
  CollectionConfigNameRecord,
  CollectionConfigStringRecord,
} from './service/graph.types';
import { CollectionConfigDto } from './service/persistence/dto/collection-config.dto';
import {
  SyncQueueConfigResponseDto,
  SyncQueueConfigDto,
} from './service/persistence/dto/sync-queue-config.dto';
import { UserSelfDto } from './service/persistence/dto/user.dto';
import { PreferenceDto } from './service/persistence/dto/preference.dto';
import { FeatureFlagsDto } from './service/persistence/dto/feature-flags.dto';
import { CollectionUtilService } from './service/collection-util.service';
import { GraphUtilService } from './service/graph-util.service';

let userInfo: UserSelfDto;
let preferencesInit: PreferenceDto;
let featureFlagsInit: FeatureFlagsDto;
let configArr: CollectionConfigDto[];
let configRecord: CollectionConfigNameRecord;
let configSrcTarRecord: CollectionConfigStringRecord;
let syncQueueConfigRecord: Record<string, SyncQueueConfigDto>;

export const CURRENT_USER = new InjectionToken<UserSelfDto>('CURRENT_USER', {
  providedIn: 'root',
  factory: () => userInfo,
});

export const INITIAL_PREFERENCES = new InjectionToken<PreferenceDto>(
  'INITIAL_PREFERENCES',
  {
    providedIn: 'root',
    factory: () => preferencesInit,
  },
);

export const FEATURE_FLAGS = new InjectionToken<FeatureFlagsDto>(
  'FEATURE_FLAGS',
  {
    providedIn: 'root',
    factory: () => featureFlagsInit,
  },
);

export const CONFIG_ARR = new InjectionToken<CollectionConfigDto[]>(
  'CONFIG_ARR',
  {
    providedIn: 'root',
    factory: () => configArr,
  },
);

export const CONFIG_RECORD = new InjectionToken<CollectionConfigNameRecord>(
  'CONFIG_RECORD',
  {
    providedIn: 'root',
    factory: () => configRecord,
  },
);

export const CONFIG_EDGE_CONFIG_MAP =
  new InjectionToken<CollectionConfigStringRecord>('CONFIG_EDGE_CONFIG_MAP', {
    providedIn: 'root',
    factory: () => configSrcTarRecord,
  });

export const SYNC_QUEUE_CONFIG_RECORD = new InjectionToken<
  Record<string, SyncQueueConfigDto>
>('SYNC_QUEUE_CONFIG_RECORD', {
  providedIn: 'root',
  factory: () => syncQueueConfigRecord,
});

export function appInitializeUserFactory(http: HttpClient): Observable<any> {
  return http
    .get<UserSelfDto>(`${environment.apiUrl}/v1/collection/user/self`)
    .pipe(
      tap((user) => {
        userInfo = user;
      }),
      catchError((e) => {
        if (e.status === 401) {
          window.location.href = `${environment.apiUrl}/auth/login`;
        }
        // Create obserable that never completes to stall start up
        return new Observable();
      }),
    );
}

export function appInitializePrefFactory(http: HttpClient): Observable<any> {
  return http
    .get<PreferenceDto>(`${environment.apiUrl}/v1/preference/self`)
    .pipe(
      tap((preferences) => {
        preferencesInit = preferences;
      }),
      catchError((e) => {
        if (e.status === 401) {
          window.location.href = `${environment.apiUrl}/auth/login`;
        }
        // Create obserable that never completes to stall start up
        return new Observable();
      }),
    );
}

export function appInitializeConfigFactory(http: HttpClient): Observable<any> {
  return forkJoin({
    collectionConfigResponse: http.get<CollectionConfigDto[]>(
      `${environment.apiUrl}/v1/collection/config/entities`,
    ),
    syncQueueConfigResponse: http.get<SyncQueueConfigResponseDto>(
      `${environment.apiUrl}/v1/collection/config/sync-queue`,
    ),
  })
    .pipe(
      tap(({ collectionConfigResponse, syncQueueConfigResponse }) => {
        const configArrInner = collectionConfigResponse;
        configArr = configArrInner;
        configRecord = CollectionUtilService.configArrToMap(configArrInner);
        configSrcTarRecord = GraphUtilService.configArrToSrcTarRecord(
          configArr,
          configRecord,
        );
        syncQueueConfigRecord = Object.fromEntries(
          (syncQueueConfigResponse.queues ?? []).map((queueConfig) => [
            queueConfig.queue,
            queueConfig,
          ]),
        );
      }),
      catchError((e) => {
        if (e.status === 401) {
          window.location.href = `${environment.apiUrl}/auth/login`;
        }
        // Create obserable that never completes to stall start up
        return new Observable();
      }),
    );
}

export function appInitializeFeatureFlagsFactory(http: HttpClient): Observable<any> {
  return http
    .get<FeatureFlagsDto>(`${environment.apiUrl}/v1/system/feature-flags`)
    .pipe(
      tap((flags) => {
        featureFlagsInit = flags;
      }),
      catchError((e) => {
        if (e.status === 401) {
          window.location.href = `${environment.apiUrl}/auth/login`;
        }
        // Create obserable that never completes to stall start up
        return new Observable();
      }),
    );
}
