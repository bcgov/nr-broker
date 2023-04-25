import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { UserDto } from './graph/graph.types';
import { InjectionToken } from '@angular/core';

let userInfo: UserDto;

export const CURRENT_USER = new InjectionToken<UserDto>('CURRENT_USER', {
  providedIn: 'root',
  factory: () => userInfo,
});

export function appInitializeFactory(http: HttpClient): () => Observable<any> {
  return () =>
    http.get<any>(`${environment.apiUrl}/v1/collection/user/self`).pipe(
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
