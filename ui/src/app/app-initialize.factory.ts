import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../environments/environment';

export function appInitializeFactory(http: HttpClient): () => Observable<any> {
  return () =>
    http.get<any>(`${environment.apiUrl}/v1/collection/user/self`).pipe(
      tap((user) => {
        console.log(user);
      }),
      catchError((e) => {
        if (e.status === 401) {
          window.location.href = `${environment.apiUrl}/auth/login`;
        }
        // Create obserable that never completes to stall startup
        return new Observable();
      }),
    );
}
