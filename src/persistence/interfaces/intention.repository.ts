import { ActionDto } from '../../intention/dto/action.dto';
import { IntentionDto } from '../../intention/dto/intention.dto';

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

  public abstract closeIntentionByToken(token: string): Promise<boolean>;

  public abstract closeIntention(intention: IntentionDto): Promise<boolean>;
}
