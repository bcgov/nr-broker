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

  /**
   * Records a Vault login token accessor issued for an action so it can be
   * revoked when the intention closes. Stored in a dedicated collection, not on
   * the intention document, so it is never serialized back to clients.
   * @param intentionId The owning intention id
   * @param actionToken The action trace token the accessor belongs to
   * @param accessor The Vault wrapped token accessor
   */
  public abstract addVaultTokenAccessor(
    intentionId: string,
    actionToken: string,
    accessor: string,
  ): Promise<void>;

  /**
   * Returns the recorded Vault token accessors for an intention.
   * @param intentionId The intention id
   * @returns The action token/accessor pairs recorded for the intention, or an empty array
   */
  public abstract getVaultTokenAccessors(
    intentionId: string,
  ): Promise<{ actionToken: string; accessor: string }[]>;

  /**
   * Removes the recorded Vault token accessors for an intention after they have
   * been revoked, when the intention closes.
   * @param intentionId The intention id
   */
  public abstract removeVaultTokenAccessors(
    intentionId: string,
  ): Promise<void>;

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

  public abstract cleanupRejected(rejectedTtl: number): Promise<void>;

  public abstract getUniqueFieldValues(
    field: string,
    search: string,
    limit: number,
  ): Promise<string[]>;
}
