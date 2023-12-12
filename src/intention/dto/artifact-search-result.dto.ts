// Shared DTO: Copy in back-end and front-end should be identical

import { ActionDto } from './action.dto';
import { ArtifactDto } from './artifact.dto';
import { IntentionDto } from './intention.dto';

export class ArtifactActionCombo {
  action!: ActionDto;
  artifact!: ArtifactDto;
  intention!: IntentionDto;
}
export class ArtifactSearchResult {
  data!: ArtifactActionCombo[];
  meta!: {
    total: number;
  };
}
