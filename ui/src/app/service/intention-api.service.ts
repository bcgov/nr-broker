import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { HttpResourceRequest } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IntentionSearchResult } from './intention/dto/intention-search-result.dto';
import { IntentionDto } from './intention/dto/intention.dto';

@Injectable({
  providedIn: 'root',
})
export class IntentionApiService {
  private readonly http = inject(HttpClient);

  searchIntentionsArgs(
    where: string,
    offset = 0,
    limit = 5,
  ): HttpResourceRequest {
    return {
      method: 'POST',
      url: `${environment.apiUrl}/v1/intention/search`,
      params: {
        where,
        offset,
        limit,
      },
    };
  }

  searchIntentions(where: string, offset = 0, limit = 5) {
    const args = this.searchIntentionsArgs(where, offset, limit);
    return this.http.request<IntentionSearchResult>(args.method ?? 'POST', args.url, {
      responseType: 'json',
      params: args.params,
      headers: args.headers as any,
      body: args.body ?? null,
    });
  }

  getFieldValues(field: string, search = '', limit = 10) {
    return this.http.get<string[]>(
      `${environment.apiUrl}/v1/intention/field/${field}/values`,
      {
        params: { search, limit },
        responseType: 'json',
      },
    );
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
