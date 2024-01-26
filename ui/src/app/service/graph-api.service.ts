import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import {
  CollectionDtoRestUnion,
  CollectionNames,
} from './dto/collection-dto-union.type';
import { environment } from '../../environments/environment';
import {
  GraphDataResponseDto,
  UpstreamResponseDto,
} from './dto/graph-data.dto';
import {
  CollectionConfigInstanceRestDto,
  CollectionConfigRestDto,
} from './dto/collection-config-rest.dto';
import { EdgeInsertDto } from './dto/edge-rest.dto';
import { VertexInsertDto } from './dto/vertex-rest.dto';
import { GraphUtilService } from './graph-util.service';
import { GraphTypeaheadResult } from './dto/graph-typeahead-result.dto';

@Injectable({
  providedIn: 'root',
})
export class GraphApiService {
  constructor(
    private readonly util: GraphUtilService,
    private readonly http: HttpClient,
  ) {}

  getData() {
    return this.http.get<GraphDataResponseDto>(
      `${environment.apiUrl}/v1/graph/data`,
      {
        responseType: 'json',
      },
    );
  }

  getConfig() {
    return this.http.get<CollectionConfigRestDto[]>(
      `${environment.apiUrl}/v1/collection/config`,
      {
        responseType: 'json',
      },
    );
  }

  getCollectionConfig(collection: CollectionNames) {
    return this.getConfig().pipe(
      map((configs) => {
        return configs.find((config) => config.collection === collection);
      }),
    );
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

  addVertex(vertex: VertexInsertDto) {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/graph/vertex`,
      vertex,
      {
        responseType: 'json',
      },
    );
  }

  editVertex(id: string, vertex: VertexInsertDto) {
    return this.http.put<any>(
      `${environment.apiUrl}/v1/graph/vertex/${encodeURIComponent(id)}`,
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

  getUpstream<T = any>(
    id: string,
    index: number,
    matchEdgeNames: string[] | null = null,
  ) {
    return this.http.post<UpstreamResponseDto<T>[]>(
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
    // targetCollection || edgeName ? '?' : '';
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
