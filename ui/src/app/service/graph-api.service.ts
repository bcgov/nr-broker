import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import {
  CollectionDtoUnion,
  CollectionNames,
} from './dto/collection-dto-union.type';
import { environment } from '../../environments/environment';
import { GraphUtilService } from './graph-util.service';
import {
  GraphDataResponseDto,
  UpstreamResponseDto,
} from './dto/graph-data.dto';
import { CollectionConfigResponseDto } from './dto/collection-config-rest.dto';
import { EdgeInsertDto } from './dto/edge-rest.dto';
import { VertexInsertDto, VertexSearchDto } from './dto/vertex-rest.dto';
import { IntentionSearchResult } from './dto/intention-search-result.dto';

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
    return this.http.get<CollectionConfigResponseDto[]>(
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

  searchIntentions(whereClause: any, offset = 0, limit = 5) {
    const whereQuery = encodeURIComponent(JSON.stringify(whereClause));
    return this.http.post<IntentionSearchResult>(
      `${environment.apiUrl}/v1/intention/search?where=${encodeURIComponent(
        whereQuery,
      )}&offset=${offset}&limit=${limit}`,
      {
        responseType: 'json',
      },
    );
  }

  searchVertex(collection: string, typeahead: string) {
    return this.http.post<VertexSearchDto[]>(
      `${
        environment.apiUrl
      }/v1/graph/vertex/search?collection=${encodeURIComponent(
        collection,
      )}&typeahead=${typeahead}`,
      {
        responseType: 'json',
      },
    );
  }
}
