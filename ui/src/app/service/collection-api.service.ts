import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  CollectionCombo,
  CollectionSearchResult,
} from './dto/collection-search-result.dto';
import { CollectionDtoRestUnion } from './dto/collection-dto-union.type';
import { GraphUtilService } from './graph-util.service';

@Injectable({
  providedIn: 'root',
})
export class CollectionApiService {
  constructor(
    private readonly util: GraphUtilService,
    private readonly http: HttpClient,
  ) {}

  public getCollectionTags<T extends keyof CollectionDtoRestUnion>(name: T) {
    return this.http.get<string[]>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(name)}/tags`,
      {
        responseType: 'json',
      },
    );
  }

  public getCollectionById<T extends keyof CollectionDtoRestUnion>(
    name: T,
    id: string,
  ) {
    return this.http.get<CollectionDtoRestUnion[T]>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(name)}/${id}`,
      {
        responseType: 'json',
      },
    );
  }

  public getCollectionComboById<T extends keyof CollectionDtoRestUnion>(
    name: T,
    id: string,
  ) {
    return this.http.get<CollectionCombo<CollectionDtoRestUnion[T]>>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(name)}/${id}/combo`,
      {
        responseType: 'json',
      },
    );
  }

  public searchCollection<T extends keyof CollectionDtoRestUnion>(
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
    return this.http.post<CollectionSearchResult<CollectionDtoRestUnion[T]>>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(
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

  public exportCollection<T extends keyof CollectionDtoRestUnion>(name: T) {
    return this.http.post<CollectionDtoRestUnion[T][]>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(name)}/export`,
      {
        responseType: 'json',
      },
    );
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
    return this.http.get(
      `${environment.apiUrl}/v1/collection/service/${serviceId}/details`,
      {
        responseType: 'json',
      },
    );
  }

  public getServiceInstanceDetails(serviceInstanceId: string) {
    return this.http.get(
      `${environment.apiUrl}/v1/collection/service-instance/${serviceInstanceId}/details`,
      {
        responseType: 'json',
      },
    );
  }

  public doUniqueKeyCheck(
    name: keyof CollectionDtoRestUnion,
    key: string,
    value: string,
  ) {
    return this.http.post<string[]>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(
        name,
      )}/unique/${key}/${value}`,
      {
        responseType: 'json',
      },
    );
  }

  public setCollectionTags(
    name: keyof CollectionDtoRestUnion,
    id: string,
    tags: string[],
  ) {
    return this.http.put<string[]>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(
        name,
      )}/${id}/tags`,
      tags,
      {
        responseType: 'json',
      },
    );
  }
}
