import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SystemApiService {
  constructor(private http: HttpClient) {}

  generateAccountToken(accountId: string) {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/collection/account/${accountId}/token`,
      {
        responseType: 'json',
      },
    );
  }
}
