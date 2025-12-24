import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { HttpResourceRequest } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  CollectionCombo,
  CollectionSearchResult,
} from './collection/dto/collection-search-result.dto';
import {
  CollectionDtoUnion,
  CollectionNames,
} from './persistence/dto/collection-dto-union.type';
import { ServiceInstanceDetailsResponseDto } from './persistence/dto/service-instance.dto';
import { ServiceDetailsResponseDto } from './persistence/dto/service.dto';
import { StringUtilService } from '../util/string-util.service';

@Injectable({
  providedIn: 'root',
})
export class CollectionApiService {
  private readonly http = inject(HttpClient);
  private readonly stringUtil = inject(StringUtilService);

  public getCollectionTags(name: CollectionNames) {
    return this.http.get<string[]>(
      `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/tags`,
      {
        responseType: 'json',
      },
    );
  }

  public getCollectionByIdArgs<T extends CollectionNames>(
    name: T,
    id: string,
  ): HttpResourceRequest {
    return {
      method: 'GET',
      url: `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/${id}`,
    };
  }

  public getCollectionById<T extends CollectionNames>(name: T, id: string) {
    const args = this.getCollectionByIdArgs(name, id);
    return this.http.request<CollectionDtoUnion[T]>(args.method ?? 'GET', args.url, {
      responseType: 'json',
      params: args.params,
      headers: args.headers as any,
      body: args.body ?? null,
    });
  }

  public getCollectionComboByIdArgs<T extends CollectionNames>(
    name: T,
    id: string,
  ): HttpResourceRequest {
    return {
      method: 'GET',
      url: `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/${id}/combo`,
    };
  }

  public getCollectionComboById<T extends CollectionNames>(
    name: T,
    id: string,
  ) {
    const args = this.getCollectionComboByIdArgs(name, id);
    return this.http.request<CollectionCombo<CollectionDtoUnion[T]>>(args.method ?? 'GET', args.url, {
      responseType: 'json',
      params: args.params,
      headers: args.headers as any,
      body: args.body ?? null,
    });
  }

  public searchCollection<T extends CollectionNames>(
    name: T,
    options: {
      q?: string;
      tags?: string[];
      upstreamVertex?: string;
      downstreamVertex?: string;
      includeRestricted?: boolean;
      id?: string;
      vertexId?: string;
      sortActive?: string;
      sortDirection?: string;
      offset: number;
      limit: number;
    },
  ) {
    const params: Record<string, string | string[]> = {
      offset: options.offset.toString(),
      limit: options.limit.toString(),
    };

    if (options.q) {
      params['q'] = options.q;
    }
    if (options.tags && options.tags.length > 0) {
      params['tags'] = options.tags;
    }
    if (options.upstreamVertex) {
      params['upstreamVertex'] = options.upstreamVertex;
    }
    if (options.downstreamVertex) {
      params['downstreamVertex'] = options.downstreamVertex;
    }
    if (options.includeRestricted) {
      params['includeRestricted'] = options.includeRestricted.toString();
    }
    if (options.id) {
      params['id'] = options.id;
    }
    if (options.vertexId) {
      params['vertexId'] = options.vertexId;
    }
    if (options.sortActive && options.sortDirection) {
      params['sort'] = options.sortActive;
      params['dir'] = options.sortDirection;
    }

    return this.http.post<CollectionSearchResult<CollectionDtoUnion[T]>>(
      `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/search`,
      null,
      {
        responseType: 'json',
        params,
      },
    );
  }

  public exportCollectionArgs<T extends CollectionNames>(
    name: T,
  ): HttpResourceRequest {
    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/export`,
    };
  }

  public exportCollection<T extends CollectionNames>(name: T) {
    const args = this.exportCollectionArgs(name);
    return this.http.request<CollectionDtoUnion[T][]>(args.method ?? 'POST', args.url, {
      responseType: 'json',
      params: args.params,
      headers: args.headers as any,
      body: args.body ?? null,
    });
  }

  public getServiceSecure(serviceId: string) {
    return this.http.get(
      `${environment.apiUrl}/v1/collection/service/${serviceId}/secure`,
      {
        responseType: 'json',
      },
    );
  }

  public getServiceDetails(serviceId: string) {
    return this.http.get<ServiceDetailsResponseDto>(
      `${environment.apiUrl}/v1/collection/service/${serviceId}/details`,
      {
        responseType: 'json',
      },
    );
  }

  public getServiceInstanceDetails(serviceInstanceId: string) {
    return this.http.get<ServiceInstanceDetailsResponseDto>(
      `${environment.apiUrl}/v1/collection/service-instance/${serviceInstanceId}/details`,
      {
        responseType: 'json',
      },
    );
  }

  public doUniqueKeyCheck(
    name: keyof CollectionDtoUnion,
    key: string,
    value: string,
  ) {
    return this.http.post<string[]>(
      `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(
        name,
      )}/unique/${key}/${value}`,
      {
        responseType: 'json',
      },
    );
  }

  public setCollectionTags(
    name: keyof CollectionDtoUnion,
    id: string,
    tags: string[],
  ) {
    return this.http.put<string[]>(
      `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(
        name,
      )}/${id}/tags`,
      tags,
      {
        responseType: 'json',
      },
    );
  }

  public teamRefreshUsers(id: string) {
    return this.http.post<string[]>(
      `${environment.apiUrl}/v1/collection/team/${id}/refresh`,
      null,
      {
        responseType: 'json',
        params: {
          syncUsers: 'true',
        },
      },
    );
  }
}
