// Shared DTO: Copy in back-end and front-end should be identical

import { IntentionDto } from './intention.dto';

export class IntentionSearchResult {
  data!: IntentionDto[];
  meta!: {
    total: number;
  };
}
