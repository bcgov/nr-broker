import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, filter, map } from 'rxjs';
import { SseClient } from 'ngx-sse-client';

import { CollectionDtoUnion } from './persistence/dto/collection-dto-union.type';
import { environment } from '../../environments/environment';
import { GraphDataResponseDto } from './persistence/dto/graph-data.dto';
import { CollectionConfigInstanceDto } from './persistence/dto/collection-config.dto';
import { EdgeInsertDto, EdgeDto } from './persistence/dto/edge.dto';
import { VertexInsertDto, VertexDto } from './persistence/dto/vertex.dto';
import { GraphTypeaheadResult } from './graph/dto/graph-typeahead-result.dto';
import { GraphEventDto } from './persistence/dto/graph-event.dto';
import { UserPermissionDto } from './persistence/dto/user-permission.dto';
import { GraphUpDownDto } from './persistence/dto/graph-updown.dto';
import { VertexPointerDto } from './persistence/dto/vertex-pointer.dto';
import { StringUtilService } from '../util/string-util.service';

@Injectable({
  providedIn: 'root',
})
export class GraphApiService {
  private readonly stringUtil = inject(StringUtilService);
  private readonly http = inject(HttpClient);
  private readonly sseClient = inject(SseClient);


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
      null,
      {
        responseType: 'json',
      },
    );
  }

  getCollectionData<T extends keyof CollectionDtoUnion>(
    collection: T,
    vertexId: string,
  ) {
    return this.http.get<T>(
      `${environment.apiUrl}/v1/collection/${this.stringUtil.snakecase(
        collection,
      )}`,
      {
        responseType: 'json',
        params: {
          vertex: vertexId,
        },
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
      `${environment.apiUrl}/v1/graph/edge/find`,
      null,
      {
        responseType: 'json',
        params: {
          name,
          source,
          target,
        },
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
      null,
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

  editVertex(id: string, vertex: VertexInsertDto, sudo = false) {
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
      `${environment.apiUrl}/v1/graph/vertex/${id}/upstream/${index}`,
      null,
      {
        responseType: 'json',
        params: {
          ...(matchEdgeNames
            ? { matchEdgeNames: matchEdgeNames.join(',') }
            : ''),
        },
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
    return this.http.post<GraphTypeaheadResult>(
      `${environment.apiUrl}/v1/graph/typeahead`,
      null,
      {
        responseType: 'json',
        params: {
          q: typeahead,
          limit: 20,
          ...(collections ? { collections } : {}),
        },
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
