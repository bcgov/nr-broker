import { HttpException } from '@nestjs/common';
import { SyncResult } from '../persistence/dto/sync-status.dto';

export function syncFailure(error: unknown, partial = false): SyncResult {
  let code: unknown;
  let message = error instanceof Error ? error.message : String(error);
  if (error instanceof HttpException) {
    code = error.getStatus();
  } else if (error && typeof error === 'object') {
    const response = 'response' in error ? error.response : undefined;
    code = response && typeof response === 'object' && 'status' in response
      ? response.status
      : 'status' in error ? error.status : 'code' in error ? error.code : 'errorCode' in error ? error.errorCode : undefined;
    if ('message' in error && typeof error.message === 'string') {
      message = error.message;
    } else if ('errorMessage' in error && typeof error.errorMessage === 'string') {
      message = error.errorMessage;
    }
    if (code === undefined && error instanceof Error && error.cause !== undefined) {
      code = syncFailure(error.cause).errorCode;
    }
  }
  return {
    state: partial ? 'partial' : 'failure',
    ...(typeof code === 'string' || typeof code === 'number' ? { errorCode: String(code) } : {}),
    errorMessage: message,
  };
}

export function syncOutcome(result: SyncResult): 'success' | 'failure' | 'unknown' {
  return result.state === 'skipped' ? 'unknown' : result.state === 'success' ? 'success' : 'failure';
}

export function syncMessage(name: string, target: string, result: SyncResult): string {
  const state = {
    success: 'completed',
    partial: 'partially completed',
    failure: 'failed',
    skipped: 'skipped',
  }[result.state];
  return `${name} ${state}: ${target}${result.errorMessage ? `. ${result.errorMessage}` : ''}`;
}
