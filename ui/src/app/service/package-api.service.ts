import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  PackageBuildDto,
  PackageBuildSearchResult,
} from './persistence/dto/package-build.dto';

@Injectable({
  providedIn: 'root',
})
export class PackageApiService {
  private readonly http = inject(HttpClient);

  getBuild(id: string) {
    return this.http.get<PackageBuildDto>(
      `${environment.apiUrl}/v1/package/${id}`,
      {
        responseType: 'json',
      },
    );
  }

  getServiceBuildByVersion(service: string, name: string, semver: string) {
    return this.http.post<PackageBuildDto>(
      `${environment.apiUrl}/v1/package/service-build?service=${service}&name=${name}&semver=${semver}`,
      {
        responseType: 'json',
      },
    );
  }

  searchBuilds(id: string, offset = 0, limit = 5, name?: string, latestPerPackage = false) {
    const params = new URLSearchParams({ serviceId: id, offset: offset.toString(), limit: limit.toString() });
    if (name) {
      params.append('name', name);
    }
    if (latestPerPackage) {
      params.append('latestPerPackage', 'true');
    }
    return this.http.post<PackageBuildSearchResult>(
      `${environment.apiUrl}/v1/package/search?${params.toString()}`,
      {
        responseType: 'json',
      },
    );
  }

  getPackageNames(serviceId: string) {
    return this.http.get<string[]>(
      `${environment.apiUrl}/v1/package/names/${serviceId}`,
      {
        responseType: 'json',
      },
    );
  }

  approveBuild(id: string) {
    return this.http.post<boolean>(
      `${environment.apiUrl}/v1/package/${id}/approve`,
      {
        responseType: 'json',
      },
    );
  }
}
