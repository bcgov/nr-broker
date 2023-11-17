// Shared DTO: Copy in back-end and front-end should be identical

import { ActionDto } from './action.dto';
import { ArtifactDto } from './artifact.dto';

class ArtifactSearchResultDatum {
  action!: ActionDto;
  artifact!: ArtifactDto;
}

export class ArtifactSearchResult {
  data!: ArtifactSearchResultDatum[];
  meta!: {
    total: number;
  };
}
