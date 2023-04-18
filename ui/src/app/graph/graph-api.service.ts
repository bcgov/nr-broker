import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GraphUtilService } from './graph-util.service';
import { CollectionConfig, GraphDataVertex } from './graph.types';

@Injectable({
  providedIn: 'root',
})
export class GraphApiService {
  constructor(private util: GraphUtilService, private http: HttpClient) {}

  getData() {
    return this.http.get<any>(`${environment.apiUrl}/v1/graph/data`, {
      responseType: 'json',
    });
  }

  getConfig() {
    return this.http.get<any>(`${environment.apiUrl}/v1/graph/config`, {
      responseType: 'json',
    });
  }

  getCollectionData(collection: string, id: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/v1/graph/${this.util.snakecase(
        collection,
      )}?vertex=${id}`,
      {
        responseType: 'json',
      },
    );
  }

  addEdge(edge: any) {
    return this.http.post<any>(`${environment.apiUrl}/v1/graph/edge`, edge, {
      responseType: 'json',
    });
  }

  deleteEdge(id: string) {
    return this.http.delete<any>(`${environment.apiUrl}/v1/graph/edge/${id}`, {
      responseType: 'json',
    });
  }

  addVertex(collection: CollectionConfig, data: any) {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/graph/vertex`,
      {
        collection: collection.collection,
        data,
      },
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
}
