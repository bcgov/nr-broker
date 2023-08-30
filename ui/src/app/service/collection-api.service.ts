import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CollectionSearchResult } from './dto/collection-search-result.dto';
import { TeamSearchDto } from './dto/team-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class CollectionApiService {
  constructor(private http: HttpClient) {}

  public searchCollection(
    name: string,
    upstreamVertex: string | null = null,
    vertexId: string | null = null,
    offset = 0,
    limit = 5,
  ) {
    return this.http.post<CollectionSearchResult<TeamSearchDto>>(
      `${environment.apiUrl}/v1/collection/${name}/search?${
        upstreamVertex ? `upstreamVertex=${upstreamVertex}&` : ''
      }${
        vertexId ? `vertexId=${vertexId}&` : ''
      }offset=${offset}&limit=${limit}`,
      {
        responseType: 'json',
      },
    );
  }
}
