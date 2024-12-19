import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { IntentionSearchResult } from './intention/dto/intention-search-result.dto';

@Injectable({
  providedIn: 'root',
})
export class IntentionApiService {
  constructor(private readonly http: HttpClient) {}

  searchIntentions(where: string, offset = 0, limit = 5) {
    const whereQuery = encodeURIComponent(where);
    return this.http.post<IntentionSearchResult>(
      `${environment.apiUrl}/v1/intention/search?where=${whereQuery}&offset=${offset}&limit=${limit}`,
      {
        responseType: 'json',
      },
    );
  }

  getIntention(id: string) {
    return this.http.get<any>(`${environment.apiUrl}/v1/intention/${id}`, {
      responseType: 'json',
    });
  }
}
