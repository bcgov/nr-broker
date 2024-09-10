import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, filter, from, map } from 'rxjs';
import {
  CollectionDtoRestUnion,
  CollectionNames,
} from './dto/collection-dto-union.type';
import { environment } from '../../environments/environment';
import { GraphDataResponseDto } from './dto/graph-data.dto';
import {
  CollectionConfigInstanceRestDto,
  CollectionConfigRestDto,
} from './dto/collection-config-rest.dto';
import { EdgeInsertDto, EdgeRestDto } from './dto/edge-rest.dto';
import { VertexInsertDto, VertexRestDto } from './dto/vertex-rest.dto';
import { GraphUtilService } from './graph-util.service';
import { GraphTypeaheadResult } from './dto/graph-typeahead-result.dto';
import { GraphEventRestDto } from './dto/graph-event-rest.dto';
import { UserPermissionRestDto } from './dto/user-permission-rest.dto';
import { CONFIG_ARR } from '../app-initialize.factory';
import { SseClient } from 'ngx-sse-client';
import { GraphUpDownRestDto } from './dto/graph-updown-rest.dto';
import { VertexPointerRestDto } from './dto/vertex-pointer-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class GraphApiService {
  constructor(
    private readonly util: GraphUtilService,
    private readonly http: HttpClient,
    private sseClient: SseClient,
    @Inject(CONFIG_ARR) public readonly configArr: CollectionConfigRestDto[],
  ) {}

  createEventSource(): Observable<GraphEventRestDto> {
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

  createTokenUpdatedEventSource(): Observable<GraphEventRestDto> {
    return this.sseClient
      .stream(`${environment.apiUrl}/v1/graph/token-updated`)
      .pipe(
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
            //console.info(
            //  `SSE request with type "${messageEvent.type}" and data "${messageEvent.data}"`,
            //);
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

  getCollectionData<T extends keyof CollectionDtoRestUnion>(
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
    return this.http.get<EdgeRestDto>(
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
    return this.http.get<VertexRestDto>(
      `${environment.apiUrl}/v1/graph/vertex/${encodeURIComponent(id)}`,
      {
        responseType: 'json',
      },
    );
  }

  addVertex(vertex: VertexInsertDto) {
    return this.http.post<VertexRestDto>(
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

  getUpstream<T extends VertexPointerRestDto = any>(
    id: string,
    index: number,
    matchEdgeNames: string[] | null = null,
  ) {
    return this.http.post<GraphUpDownRestDto<T>[]>(
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
    return this.http.get<UserPermissionRestDto>(
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
    return this.http.get<CollectionConfigInstanceRestDto[]>(
      `${environment.apiUrl}/v1/graph/vertex/${sourceId}/edge-config${
        params.length > 0 ? '?' + params.join('&') : ''
      }`,
      {
        responseType: 'json',
      },
    );
  }
}
