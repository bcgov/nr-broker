// Shared DTO: Copy in back-end and front-end should be identical

import { ActionDto } from './action.dto';
import { ArtifactDto } from './artifact.dto';

export class ArtifactSearchResult {
  data!: Array<{ action: ActionDto; artifact: ArtifactDto }>;
  meta!: {
    total: number;
  };
}
