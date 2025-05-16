import { HttpClient } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../environments/environment';
import {
  CollectionConfigNameRecord,
  CollectionConfigStringRecord,
} from './service/graph.types';
import { CollectionConfigDto } from './service/persistence/dto/collection-config.dto';
import { UserSelfDto } from './service/persistence/dto/user.dto';
import { PreferenceDto } from './service/persistence/dto/preference.dto';
import { CollectionUtilService } from './service/collection-util.service';
import { GraphUtilService } from './service/graph-util.service';

let userInfo: UserSelfDto;
let preferencesInit: PreferenceDto;
let configArr: CollectionConfigDto[];
let configRecord: CollectionConfigNameRecord;
let configSrcTarRecord: CollectionConfigStringRecord;

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
  return http
    .get<CollectionConfigDto[]>(`${environment.apiUrl}/v1/collection/config`)
    .pipe(
      tap((configArrInner) => {
        configArr = configArrInner;
        configRecord = CollectionUtilService.configArrToMap(configArrInner);
        configSrcTarRecord = GraphUtilService.configArrToSrcTarRecord(
          configArr,
          configRecord,
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
