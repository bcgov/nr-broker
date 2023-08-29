import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GraphUtilService } from './graph-util.service';
import { GraphDataVertex } from './graph.types';
import {
  GraphDataResponseDto,
  UpstreamResponseDto,
} from './dto/graph-data.dto';
import { CollectionConfigResponseDto } from './dto/collection-config-rest.dto';
import { EdgeInsertDto } from './dto/edge-rest.dto';
import { VertexInsertDto, VertexSearchDto } from './dto/vertex-rest.dto';
import { IntentionSearchResult } from './dto/intention-search-result.dto';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GraphApiService {
  constructor(
    private util: GraphUtilService,
    private http: HttpClient,
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

  getCollectionConfig(collection: string) {
    return this.getConfig().pipe(
      map((configs) => {
        return configs.find((config) => config.collection === collection);
      }),
    );
  }

  getCollectionData<T = any>(collection: string, id: string) {
    return this.http.get<T>(
      `${environment.apiUrl}/v1/collection/${this.util.snakecase(
        collection,
      )}?vertex=${id}`,
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
      `${environment.apiUrl}/v1/graph/edge/${id}`,
      edge,
      {
        responseType: 'json',
      },
    );
  }

  deleteEdge(id: string) {
    return this.http.delete<any>(`${environment.apiUrl}/v1/graph/edge/${id}`, {
      responseType: 'json',
    });
  }

  searchEdge(name: string, sourceId: string, targetId: string) {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/graph/edge/search?name=${name}&sourceId=${sourceId}&targetId=${targetId}`,
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

  editVertex(vertex: GraphDataVertex, data: any) {
    const vertexData: any = {
      id: vertex.id,
      collection: vertex.collection,
      name: vertex.name,
      data,
    };
    if (vertex.prop) {
      vertexData.prop = vertex.prop;
    }
    return this.http.put<any>(
      `${environment.apiUrl}/v1/graph/vertex/${vertex.id}`,
      vertexData,
      {
        responseType: 'json',
      },
    );
  }

  deleteVertex(id: string) {
    return this.http.delete<any>(
      `${environment.apiUrl}/v1/graph/vertex/${id}`,
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
        matchEdgeNames ? `?matchEdgeNames=${matchEdgeNames.join(',')}` : ''
      }`,
      {
        responseType: 'json',
      },
    );
  }

  searchIntentions(whereClause: any, offset = 0, limit = 5) {
    const whereQuery = encodeURIComponent(JSON.stringify(whereClause));
    return this.http.post<IntentionSearchResult>(
      `${environment.apiUrl}/v1/intention/search?where=${whereQuery}&offset=${offset}&limit=${limit}`,
      {
        responseType: 'json',
      },
    );
  }

  searchVertex(collection: string, typeahead: string) {
    return this.http.post<VertexSearchDto[]>(
      `${environment.apiUrl}/v1/graph/vertex/search?collection=${collection}&typeahead=${typeahead}`,
      {
        responseType: 'json',
      },
    );
  }
}
