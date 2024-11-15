// Shared DTO: Copy in back-end and front-end should be identical

import { ActionDto } from './action.dto';
import { ArtifactDto } from './artifact.dto';
import { IntentionEntity } from './intention.entity';

export class ArtifactActionCombo {
  action!: ActionDto;
  artifact!: ArtifactDto;
  intention!: IntentionEntity;
}
export class ArtifactSearchResult {
  data!: ArtifactActionCombo[];
  meta!: {
    total: number;
  };
}
