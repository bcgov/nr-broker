import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PackageApiService {
  constructor(private readonly http: HttpClient) {}

  searchBuilds(id: string, offset = 0, limit = 5) {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/package/search?id=${id}&offset=${offset}&limit=${limit}`,
      {
        responseType: 'json',
      },
    );
  }

  approveBuild(id: string) {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/package/${id}/approve`,
      {
        responseType: 'json',
      },
    );
  }
}
