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
import { VertexInsertDto } from './dto/vertex-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class GraphApiService {
  constructor(private util: GraphUtilService, private http: HttpClient) {}

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

  deleteEdge(id: string) {
    return this.http.delete<any>(`${environment.apiUrl}/v1/graph/edge/${id}`, {
      responseType: 'json',
    });
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

  getUpstream<T = any>(id: string, index: number) {
    return this.http.post<UpstreamResponseDto<T>[]>(
      `${environment.apiUrl}/v1/graph/vertex/${id}/upstream/${index}`,
      {
        responseType: 'json',
      },
    );
  }
}
