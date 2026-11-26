import { HttpException } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { SyncResult } from '../persistence/dto/sync-status.dto';

export function syncFailure(error: unknown, partial = false): SyncResult {
  let code: unknown;
  let errorMessage = error instanceof Error ? error.message : String(error);
  if (error instanceof HttpException) {
    code = error.getStatus();
    const response = error.getResponse();
    if (typeof response === 'object' && response !== null && 'error' in response) {
      errorMessage = String(response.error ?? errorMessage);
    }
  } else if (isAxiosError(error)) {
    code = error.response?.status ?? error.code;
  } else if (error instanceof Error) {
    code = ('status' in error && error.status) || ('code' in error && error.code);
  }
  return {
    state: partial ? 'partial' : 'failure',
    ...(typeof code === 'string' || typeof code === 'number' ? { errorCode: String(code) } : {}),
    errorMessage,
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
