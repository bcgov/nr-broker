import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  constructor(
    private readonly http: HttpClient,
    private readonly stringUtil: StringUtilService,
  ) {}

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
  ): { method: string; url: string; options: { responseType: 'json' } } {
    return {
      method: 'GET',
      url: `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/${id}`,
      options: { responseType: 'json' },
    };
  }

  public getCollectionById<T extends CollectionNames>(name: T, id: string) {
    const { url, options } = this.getCollectionByIdArgs(name, id);
    return this.http.get<CollectionDtoUnion[T]>(url, options);
  }

  public getCollectionComboByIdArgs<T extends CollectionNames>(
    name: T,
    id: string,
  ): { method: string; url: string; options: { responseType: 'json' } } {
    return {
      method: 'GET',
      url: `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/${id}/combo`,
      options: { responseType: 'json' },
    };
  }

  public getCollectionComboById<T extends CollectionNames>(
    name: T,
    id: string,
  ) {
    const { url, options } = this.getCollectionComboByIdArgs(name, id);
    return this.http.get<CollectionCombo<CollectionDtoUnion[T]>>(url, options);
  }

  public searchCollection<T extends CollectionNames>(
    name: T,
    options: {
      q?: string;
      tags?: string[];
      upstreamVertex?: string;
      downstreamVertex?: string;
      id?: string;
      vertexId?: string;
      sortActive?: string;
      sortDirection?: string;
      offset: number;
      limit: number;
    },
  ) {
    return this.http.post<CollectionSearchResult<CollectionDtoUnion[T]>>(
      `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(
        name,
      )}/search?${options.q ? `q=${encodeURIComponent(options.q)}&` : ''}${
        options.tags
          ? options.tags
              .map((tag) => `tags=${encodeURIComponent(tag)}&`)
              .join('')
          : ''
      }${
        options.upstreamVertex
          ? `upstreamVertex=${options.upstreamVertex}&`
          : ''
      }${
        options.downstreamVertex
          ? `downstreamVertex=${options.downstreamVertex}&`
          : ''
      }${options.id ? `id=${options.id}&` : ''}${
        options.vertexId ? `vertexId=${options.vertexId}&` : ''
      }${options.sortActive && options.sortDirection ? `sort=${options.sortActive}&` : ''}${
        options.sortActive && options.sortDirection
          ? `dir=${options.sortDirection}&`
          : ''
      }offset=${options.offset}&limit=${options.limit}`,
      {
        responseType: 'json',
      },
    );
  }

  public exportCollectionArgs<T extends CollectionNames>(
    name: T,
  ): { method: string; url: string; options: { responseType: 'json' } } {
    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(name)}/export`,
      options: { responseType: 'json' },
    };
  }

  public exportCollection<T extends CollectionNames>(name: T) {
    const { url, options } = this.exportCollectionArgs(name);
    return this.http.post<CollectionDtoUnion[T][]>(url, options);
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
