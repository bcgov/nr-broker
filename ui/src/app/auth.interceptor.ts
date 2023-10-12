import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../environments/environment';

export const AUTH_INTERCEPTOR_RETURN_URL_SESSION_KEY = 'postLoginUrl';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((e) => {
        if (e.status === 401) {
          sessionStorage.setItem(
            AUTH_INTERCEPTOR_RETURN_URL_SESSION_KEY,
            window.location.href,
          );
          window.location.href = `${environment.apiUrl}/auth/login`;
          return of();
        }
        throw e;
      }),
    );
  }
}
