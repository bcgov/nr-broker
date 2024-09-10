import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { JwtRegistryDto, TokenCreateDto } from './dto/jwt-registry-rest.dto';
import { ConnectionConfigRestDto } from './dto/connection-config-rest.dto';

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
