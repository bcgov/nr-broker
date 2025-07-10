import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IntentionSearchResult } from './intention/dto/intention-search-result.dto';
import { IntentionDto } from './intention/dto/intention.dto';

@Injectable({
  providedIn: 'root',
})
export class IntentionApiService {
  constructor(private readonly http: HttpClient) {}

  searchIntentionsArgs(
    where: string,
    offset = 0,
    limit = 5,
  ): {
    method: string;
    url: string;
    headers: {
      responseType: 'json';
    };
    params: { where: string; offset: number; limit: number };
  } {
    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/intention/search`,
      headers: {
        responseType: 'json',
      },
      params: {
        where,
        offset,
        limit,
      },
    };
  }

  searchIntentions(where: string, offset = 0, limit = 5) {
    const { url, headers, params } = this.searchIntentionsArgs(
      where,
      offset,
      limit,
    );
    return this.http.post<IntentionSearchResult>(url, null, {
      responseType: headers.responseType,
      params,
    });
  }

  getIntentionArgs(id: string) {
    return {
      method: 'GET',
      url: `${environment.apiUrl}/v1/intention/${id}`,
      headers: {
        responseType: 'json',
      },
    };
  }

  getIntention(id: string) {
    return this.http.get<IntentionDto>(
      `${environment.apiUrl}/v1/intention/${id}`,
      {
        responseType: 'json',
      },
    );
  }
}
