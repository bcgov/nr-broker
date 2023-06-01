import { HttpClient } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { UserDto } from './service/graph.types';
import { PreferenceRestDto } from './preference-rest.dto';

let userInfo: UserDto;
let preferencesInit: PreferenceRestDto;

export const CURRENT_USER = new InjectionToken<UserDto>('CURRENT_USER', {
  providedIn: 'root',
  factory: () => userInfo,
});

export const INITIAL_PREFERENCES = new InjectionToken<PreferenceRestDto>(
  'INITIAL_PREFERENCES',
  {
    providedIn: 'root',
    factory: () => preferencesInit,
  },
);

export function appInitializeUserFactory(
  http: HttpClient,
): () => Observable<any> {
  return () =>
    http.get<UserDto>(`${environment.apiUrl}/v1/collection/user/self`).pipe(
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

export function appInitializePrefFactory(
  http: HttpClient,
): () => Observable<any> {
  return () =>
    http
      .get<PreferenceRestDto>(`${environment.apiUrl}/v1/preference/self`)
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
