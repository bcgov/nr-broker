import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { JwtRegistryDto, TokenCreateDto } from './dto/jwt-registry-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class SystemApiService {
  constructor(private readonly http: HttpClient) {}

  getAccountTokens(accountId: string) {
    return this.http.get<JwtRegistryDto[]>(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token`,
      {
        responseType: 'json',
      },
    );
  }

  generateAccountToken(accountId: string, expirationDaysInSeconds: number) {
    return this.http.post<TokenCreateDto>(
      `${environment.apiUrl}/v1/collection/broker-account/${accountId}/token?expirationDaysInSeconds=${expirationDaysInSeconds}`,
      {
        responseType: 'json',
      },
    );
  }
}
