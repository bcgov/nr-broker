import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CollectionSearchResult } from './dto/collection-search-result.dto';
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

  public searchCollection<T extends keyof CollectionDtoRestUnion>(
    name: T,
    options: {
      q?: string;
      upstreamVertex?: string;
      id?: string;
      vertexId?: string;
      offset: number;
      limit: number;
    },
  ) {
    return this.http.post<CollectionSearchResult<CollectionDtoRestUnion[T]>>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(
        name,
      )}/search?${options.q ? `q=${encodeURIComponent(options.q)}&` : ''}${
        options.upstreamVertex
          ? `upstreamVertex=${options.upstreamVertex}&`
          : ''
      }${options.id ? `id=${options.id}&` : ''}${
        options.vertexId ? `vertexId=${options.vertexId}&` : ''
      }offset=${options.offset}&limit=${options.limit}`,
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
}
