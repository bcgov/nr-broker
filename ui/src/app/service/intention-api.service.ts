import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { HttpResourceRequest } from '@angular/common/http';
import { filter, finalize, map, Observable, share } from 'rxjs';
import { SseClient } from 'ngx-sse-client';
import { environment } from '../../environments/environment';
import { IntentionSearchResult } from './intention/dto/intention-search-result.dto';
import { IntentionDto } from './intention/dto/intention.dto';
import { GlobalStatsDto } from './intention/dto/global-stats.dto';
import { CelebrationEventDto } from './intention/dto/celebration-event.dto';

@Injectable({
  providedIn: 'root',
})
export class IntentionApiService {
  private readonly http = inject(HttpClient);
  private readonly sseClient = inject(SseClient);

  static celebrationEventObserver: Observable<CelebrationEventDto> | null =
    null;

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

  getGlobalStats(recent = 10, accounts = 5) {
    return this.http.get<GlobalStatsDto>(
      `${environment.apiUrl}/v1/intention/stats`,
      {
        params: { recent, accounts },
        responseType: 'json',
      },
    );
  }

  /**
   * Subscribes to the realtime `celebration` Server-Sent Events stream. A
   * lightweight success event is broadcast on the Redis `celebration` channel
   * whenever an intention closes successfully, so the UI can celebrate team
   * activity in realtime.
   */
  createCelebrationEventSource(): Observable<CelebrationEventDto> {
    if (!IntentionApiService.celebrationEventObserver) {
      IntentionApiService.celebrationEventObserver = this.sseClient
        .stream(`${environment.apiUrl}/v1/intention/celebration/events`)
        .pipe(
          filter((event) => {
            if (event.type === 'error') {
              const errorEvent = event as ErrorEvent;
              if (errorEvent.error) {
                console.error(errorEvent.error, errorEvent.message);
              }
              return false;
            }
            return true;
          }),
          map((event): CelebrationEventDto | undefined => {
            if (event.type !== 'error') {
              const messageEvent = event as MessageEvent;
              return JSON.parse(messageEvent.data) as CelebrationEventDto;
            }
            return undefined;
          }),
          filter(
            (data: CelebrationEventDto | undefined): data is CelebrationEventDto =>
              !!data &&
              typeof data === 'object' &&
              !('event' in data && (data as any).event === 'heartbeat'),
          ),
          finalize(() => {
            IntentionApiService.celebrationEventObserver = null;
          }),
          share(),
        );
    }
    return IntentionApiService.celebrationEventObserver;
  }
}
