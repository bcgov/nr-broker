import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, filter, from, map } from 'rxjs';
import { SseClient } from 'ngx-sse-client';

import { CONFIG_ARR } from '../app-initialize.factory';
import {
  CollectionDtoUnion,
  CollectionNames,
} from './persistence/dto/collection-dto-union.type';
import { environment } from '../../environments/environment';
import { GraphDataResponseDto } from './persistence/dto/graph-data.dto';
import {
  CollectionConfigInstanceDto,
  CollectionConfigDto,
} from './persistence/dto/collection-config.dto';
import { EdgeInsertDto, EdgeDto } from './persistence/dto/edge.dto';
import { VertexInsertDto, VertexDto } from './persistence/dto/vertex.dto';
import { GraphUtilService } from './graph-util.service';
import { GraphTypeaheadResult } from './graph/dto/graph-typeahead-result.dto';
import { GraphEventDto } from './persistence/dto/graph-event.dto';
import { UserPermissionDto } from './persistence/dto/user-permission.dto';
import { GraphUpDownDto } from './persistence/dto/graph-updown.dto';
import { VertexPointerDto } from './persistence/dto/vertex-pointer.dto';

@Injectable({
  providedIn: 'root',
})
export class GraphApiService {
  constructor(
    private readonly util: GraphUtilService,
    private readonly http: HttpClient,
    private sseClient: SseClient,
    @Inject(CONFIG_ARR) public readonly configArr: CollectionConfigDto[],
  ) {}

  createEventSource(): Observable<GraphEventDto> {
    return this.sseClient.stream(`${environment.apiUrl}/v1/graph/events`).pipe(
      filter((event) => {
        if (event.type === 'error') {
          const errorEvent = event as ErrorEvent;
          if (errorEvent.error) {
            console.error(errorEvent.error, errorEvent.message);
          }
          return false;
        }
        return true;
      }),
      map((event) => {
        if (event.type !== 'error') {
          const messageEvent = event as MessageEvent;
          // console.info(
          //   `SSE request with type "${messageEvent.type}" and data "${messageEvent.data}"`,
          // );
          return JSON.parse(messageEvent.data);
        }
      }),
    );
  }

  getData() {
    return this.http.get<GraphDataResponseDto>(
      `${environment.apiUrl}/v1/graph/data`,
      {
        responseType: 'json',
      },
    );
  }

  getDataSlice(collections: string[]) {
    return this.http.get<GraphDataResponseDto>(
      `${environment.apiUrl}/v1/graph/data-slice/${collections.sort().join(',')}`,
      {
        responseType: 'json',
      },
    );
  }

  getVertexConnected() {
    return this.http.post<string[]>(
      `${environment.apiUrl}/v1/graph/vertex/connected`,
      {
        responseType: 'json',
      },
    );
  }

  getConfig() {
    return from([this.configArr]);
  }

  getCollectionConfig(collection: CollectionNames) {
    const config = this.configArr.find(
      (config) => config.collection === collection,
    );

    return config ? from([config]) : from([]);
  }

  getCollectionData<T extends keyof CollectionDtoUnion>(
    collection: T,
    vertexId: string,
  ) {
    return this.http.get<T>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(
        collection,
      )}?vertex=${encodeURIComponent(vertexId)}`,
      {
        responseType: 'json',
      },
    );
  }

  getEdge(id: string) {
    return this.http.get<EdgeDto>(
      `${environment.apiUrl}/v1/graph/edge/${encodeURIComponent(id)}`,
      {
        responseType: 'json',
      },
    );
  }

  addEdge(edge: EdgeInsertDto) {
    return this.http.post<any>(`${environment.apiUrl}/v1/graph/edge`, edge, {
      responseType: 'json',
    });
  }

  editEdge(id: string, edge: EdgeInsertDto) {
    return this.http.put<any>(
      `${environment.apiUrl}/v1/graph/edge/${encodeURIComponent(id)}`,
      edge,
      {
        responseType: 'json',
      },
    );
  }

  deleteEdge(id: string) {
    return this.http.delete<any>(
      `${environment.apiUrl}/v1/graph/edge/${encodeURIComponent(id)}`,
      {
        responseType: 'json',
      },
    );
  }

  findEdge(name: string, source: string, target: string) {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/graph/edge/find?name=${encodeURIComponent(
        name,
      )}&source=${encodeURIComponent(source)}&target=${encodeURIComponent(
        target,
      )}`,
      {
        responseType: 'json',
      },
    );
  }

  searchEdgesShallow(
    name: string,
    map: 'id' | 'source' | 'target' | '',
    source?: string,
    target?: string,
  ) {
    return this.http.post<any>(
      `${
        environment.apiUrl
      }/v1/graph/edge/shallow-search?name=${encodeURIComponent(name)}` +
        (source ? `&source=${encodeURIComponent(source)}` : '') +
        (target ? `&target=${encodeURIComponent(target)}` : '') +
        (map ? `&map=${encodeURIComponent(map)}` : ''),
      {
        responseType: 'json',
      },
    );
  }

  getVertex(id: string) {
    return this.http.get<VertexDto>(
      `${environment.apiUrl}/v1/graph/vertex/${encodeURIComponent(id)}`,
      {
        responseType: 'json',
      },
    );
  }

  addVertex(vertex: VertexInsertDto) {
    return this.http.post<VertexDto>(
      `${environment.apiUrl}/v1/graph/vertex`,
      vertex,
      {
        responseType: 'json',
      },
    );
  }

  editVertex(id: string, vertex: VertexInsertDto, sudo: boolean = false) {
    return this.http.put<any>(
      `${environment.apiUrl}/v1/graph/vertex/${encodeURIComponent(id)}${sudo ? '?sudo=true' : ''}`,
      vertex,
      {
        responseType: 'json',
      },
    );
  }

  deleteVertex(id: string) {
    return this.http.delete<any>(
      `${environment.apiUrl}/v1/graph/vertex/${encodeURIComponent(id)}`,
      {
        responseType: 'json',
      },
    );
  }

  getUpstream<T extends VertexPointerDto = any>(
    id: string,
    index: number,
    matchEdgeNames: string[] | null = null,
  ) {
    return this.http.post<GraphUpDownDto<T>[]>(
      `${environment.apiUrl}/v1/graph/vertex/${id}/upstream/${index}${
        matchEdgeNames
          ? `?matchEdgeNames=${encodeURIComponent(matchEdgeNames.join(','))}`
          : ''
      }`,
      {
        responseType: 'json',
      },
    );
  }

  getUserPermissions() {
    return this.http.get<UserPermissionDto>(
      `${environment.apiUrl}/v1/graph/data/user-permissions`,
      {
        responseType: 'json',
      },
    );
  }

  doTypeaheadSearch(typeahead: string, collections?: string[]) {
    const collectionClause = collections
      ? `&${collections.map((collection) => `collections=${collection}`)}`
      : '';
    return this.http.post<GraphTypeaheadResult>(
      `${environment.apiUrl}/v1/graph/typeahead?q=${typeahead}${collectionClause}`,
      {
        responseType: 'json',
      },
    );
  }

  getEdgeConfigByVertex(
    sourceId: string,
    targetCollection?: string,
    edgeName?: string,
  ) {
    const params = [];
    if (targetCollection) {
      params.push(`targetCollection=${encodeURIComponent(targetCollection)}`);
    }
    if (edgeName) {
      params.push(`edgeName=${encodeURIComponent(edgeName)}`);
    }
    return this.http.get<CollectionConfigInstanceDto[]>(
      `${environment.apiUrl}/v1/graph/vertex/${sourceId}/edge-config${
        params.length > 0 ? '?' + params.join('&') : ''
      }`,
      {
        responseType: 'json',
      },
    );
  }
}
