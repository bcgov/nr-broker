export interface SyncResult {
  state: 'success' | 'failure' | 'partial' | 'skipped';
  errorCode?: string;
  errorMessage?: string;
}

export class SyncStatusDto {
  queuedAt?: number;
  syncAt?: number;
  state?: SyncResult['state'];
  errorCode?: string;
  errorMessage?: string;
}
