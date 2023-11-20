import { FindOptionsWhere } from 'typeorm';
import { ActionDto } from '../../intention/dto/action.dto';
import { IntentionDto } from '../../intention/dto/intention.dto';
import { IntentionSearchResult } from '../../intention/dto/intention-search-result.dto';
import { ArtifactDto } from '../../intention/dto/artifact.dto';
import { ArtifactSearchResult } from '../../intention/dto/artifact-search-result.dto';

export abstract class IntentionRepository {
  public abstract addIntention(intention: IntentionDto): Promise<any>;

  public abstract findAllIntention(): Promise<IntentionDto[]>;

  public abstract findExpiredIntentions(): Promise<IntentionDto[]>;

  public abstract getIntentionByToken(
    token: string,
  ): Promise<IntentionDto | null>;

  public abstract getIntentionByActionToken(
    token: string,
  ): Promise<IntentionDto | null>;

  public abstract getIntentionActionByToken(
    token: string,
  ): Promise<ActionDto | null>;

  public abstract setIntentionActionLifecycle(
    token: string,
    outcome: string | undefined,
    type: 'start' | 'end',
  ): Promise<ActionDto>;

  public abstract addIntentionActionArtifact(
    token: string,
    artifact: ArtifactDto,
  ): Promise<ActionDto>;

  public abstract closeIntentionByToken(token: string): Promise<boolean>;

  public abstract closeIntention(intention: IntentionDto): Promise<boolean>;

  public abstract searchIntentions(
    where: FindOptionsWhere<IntentionDto> | FindOptionsWhere<IntentionDto>[],
    offset: number,
    limit: number,
  ): Promise<IntentionSearchResult>;

  public abstract searchArtifacts(
    packageGuid: string | null,
    artifactChecksum: string | null,
    artifactName: string | null,
    artifactType: string | null,
    service: string | null,
    offset: number,
    limit: number,
  ): Promise<ArtifactSearchResult>;
}
