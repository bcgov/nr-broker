import { ObjectId } from 'mongodb';
import { ActionDto } from '../../intention/dto/action.dto';
import { IntentionEntity } from '../../intention/dto/intention.entity';
import { IntentionSearchResult } from '../../intention/dto/intention-search-result.dto';
import { ArtifactDto } from '../../intention/dto/artifact.dto';

export abstract class IntentionRepository {
  public abstract addIntention(intention: IntentionEntity): Promise<any>;

  public abstract getIntention(
    id: string | ObjectId,
  ): Promise<IntentionEntity | null>;

  public abstract findAllIntention(): Promise<IntentionEntity[]>;

  public abstract findExpiredIntentions(): Promise<IntentionEntity[]>;

  public abstract getIntentionByToken(
    token: string,
  ): Promise<IntentionEntity | null>;

  public abstract getIntentionByActionToken(
    token: string,
  ): Promise<IntentionEntity | null>;

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

  public abstract closeIntention(intention: IntentionEntity): Promise<boolean>;

  public abstract searchIntentions(
    where: any,
    // | FindOptionsWhere<IntentionEntity>
    // | FindOptionsWhere<IntentionEntity>[],
    offset: number,
    limit: number,
  ): Promise<IntentionSearchResult>;

  public abstract setActionPackageBuildRef(
    id: ObjectId | string,
    actionId: string,
    packageId: ObjectId,
  ): Promise<void>;

  public abstract cleanupTransient(transientTtl: number): Promise<void>;
}
