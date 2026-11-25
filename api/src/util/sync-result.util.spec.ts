import { BadRequestException } from '@nestjs/common';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { syncFailure } from './sync-result.util';

describe('syncFailure', () => {
  it('uses the error from the HTTP response and status', () => {
    expect(syncFailure(new BadRequestException('Invalid catalog'))).toEqual({
      state: 'failure', errorCode: '400', errorMessage: 'Bad Request',
    });
  });

  it('uses the error detail from structured HTTP exceptions', () => {
    expect(syncFailure(new BadRequestException({
      statusCode: 400,
      message: 'Less useful summary',
      error: 'One-to-many relation already has a parent',
    }))).toEqual({
      state: 'failure',
      errorCode: '400',
      errorMessage: 'One-to-many relation already has a parent',
    });
  });

  it('uses the original error message for partial failures', () => {
    expect(syncFailure(new Error('Sync failed'), true)).toEqual({
      state: 'partial', errorMessage: 'Sync failed',
    });
  });

  it('uses Axios error messages and HTTP status without interpreting response bodies', () => {
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 403, statusText: 'Forbidden', data: { message: 'Different response message' },
      headers: {}, config: { headers: new AxiosHeaders() },
    });
    expect(syncFailure(error)).toEqual({
      state: 'failure', errorCode: '403', errorMessage: 'Request failed',
    });
  });

  it('preserves error codes supplied by the error', () => {
    expect(syncFailure(Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' }))).toEqual({
      state: 'failure', errorCode: 'ECONNREFUSED', errorMessage: 'Connection failed',
    });
  });
});
