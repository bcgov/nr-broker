import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CollectionWatchDto } from './persistence/dto/collection-watch.dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GraphWatchApiService {
  private readonly apiUrl = `${environment.apiUrl}/v1/graph/vertex`;
  private readonly http = inject(HttpClient);

  getCollectionWatchArgs(vertexId: string): HttpResourceRequest {
    return {
      method: 'GET',
      url: `${this.apiUrl}/${vertexId}/watch`,
      headers: {
        responseType: 'json',
      },
    };
  }

  getCollectionWatch(vertexId: string): Observable<CollectionWatchDto> {
    const args = this.getCollectionWatchArgs(vertexId);
    return this.http.request<CollectionWatchDto>(args.method ?? 'GET', args.url, {
      responseType: 'json',
      headers: args.headers as any,
    });
  }

  setCollectionWatch(vertexId: string, watches: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${vertexId}/watch`, { watches });
  }

  deleteCollectionWatch(vertexId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${vertexId}/watch`);
  }
}
