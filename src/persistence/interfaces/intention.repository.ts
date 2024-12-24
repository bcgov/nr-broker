import { ObjectId } from 'mongodb';
import { IntentionEntity } from '../../intention/entity/intention.entity';
import { IntentionSearchResult } from '../../intention/dto/intention-search-result.dto';
import { ActionEmbeddable } from '../../intention/entity/action.embeddable';
import { ArtifactEmbeddable } from '../../intention/entity/artifact.embeddable';

export abstract class IntentionRepository {
  public abstract addIntention(intention: IntentionEntity): Promise<void>;

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
  ): Promise<ActionEmbeddable | null>;

  public abstract setIntentionActionLifecycle(
    intention: IntentionEntity,
    action: ActionEmbeddable,
    outcome: string | undefined,
    type: 'start' | 'end',
  ): Promise<boolean>;

  public abstract addIntentionActionArtifact(
    token: string,
    artifact: ArtifactEmbeddable,
  ): Promise<ActionEmbeddable>;

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
