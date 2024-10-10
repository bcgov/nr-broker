import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response as ExpressResponse } from 'express';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { RedisClientType } from 'redis';
import {
  PERSISTENCE_CACHE_METADATA_KEY,
  PERSISTENCE_CACHE_METADATA_SUFFIX,
  PERSISTENCE_CACHE_METADATA_TTL,
} from './persistence.constants';

export interface Response<T> {
  data: T;
}

@Injectable()
export class PersistenceCacheInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(
    @Inject('REDIS_CLIENT') private client: RedisClientType,
    protected readonly reflector: Reflector,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ttlValue =
      this.reflector.get(
        PERSISTENCE_CACHE_METADATA_TTL,
        context.getHandler(),
      ) ??
      this.reflector.get(PERSISTENCE_CACHE_METADATA_TTL, context.getClass()) ??
      null;
    let keyValue =
      this.reflector.get(
        PERSISTENCE_CACHE_METADATA_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get(PERSISTENCE_CACHE_METADATA_KEY, context.getClass()) ??
      null;
    const suffixValue =
      this.reflector.get(
        PERSISTENCE_CACHE_METADATA_SUFFIX,
        context.getHandler(),
      ) ??
      this.reflector.get(
        PERSISTENCE_CACHE_METADATA_SUFFIX,
        context.getClass(),
      ) ??
      null;

    if (!keyValue) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    // console.log(request.params);
    // console.log(suffixValue);
    if (
      suffixValue &&
      request.params[suffixValue] &&
      typeof request.params[suffixValue] === 'string'
    ) {
      const suffixArr = request.params[suffixValue].split(',').sort();
      const hash = crypto
        .createHash('sha256')
        .update(suffixArr.join('|'))
        .digest('hex');
      keyValue = `${keyValue}-${hash}`;
      // console.log(keyValue);
    }

    const response = context.switchToHttp().getResponse<ExpressResponse>();
    response.header('Cache-Control', 'no-cache');

    return from(this.client.get(keyValue)).pipe(
      switchMap((cacheData) => {
        if (cacheData) {
          // console.log('Cache: hit - interceptor');
          return of(cacheData);
        }
        return next.handle().pipe(
          tap(async (data) => {
            // console.log('Cache: set');
            await this.client.set(
              keyValue,
              JSON.stringify(data),
              ttlValue
                ? {
                    EX: ttlValue,
                  }
                : {},
            );
          }),
        );
      }),
    );
  }
}
