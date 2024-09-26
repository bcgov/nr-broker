import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  PackageBuildRestDto,
  PackageBuildSearchResult,
} from './dto/package-build-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class PackageApiService {
  constructor(private readonly http: HttpClient) {}

  getBuild(id: string) {
    return this.http.get<PackageBuildRestDto>(
      `${environment.apiUrl}/v1/package/${id}`,
      {
        responseType: 'json',
      },
    );
  }

  searchBuilds(id: string, offset = 0, limit = 5) {
    return this.http.post<PackageBuildSearchResult>(
      `${environment.apiUrl}/v1/package/search?serviceId=${id}&offset=${offset}&limit=${limit}`,
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
