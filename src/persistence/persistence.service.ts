import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { IntentionDto } from '../intention/dto/intention.dto';

const INTENTION_PREFIX = 'int-';
const ACTION_PREFIX = 'act-';

@Injectable()
export class PersistenceService {
  constructor(@Inject('REDIS_CLIENT') private client: RedisClientType) {}

  public async addIntention(
    intention: IntentionDto,
    ttl: number,
  ): Promise<any> {
    return Promise.all([
      this.client.set(
        `${INTENTION_PREFIX}${intention.transaction.token}`,
        JSON.stringify(intention),
        {
          EX: ttl,
        },
      ),
      ...intention.actions.map((action) => {
        return this.client.set(
          `${ACTION_PREFIX}${action.transaction.token}`,
          JSON.stringify(action),
          {
            EX: ttl,
          },
        );
      }),
    ]);
  }

  public async getIntention(token: string): Promise<IntentionDto | null> {
    const intentionStr = await this.client.get(`${INTENTION_PREFIX}${token}`);
    return intentionStr ? JSON.parse(intentionStr) : null;
  }

  public async getIntentionAction(token: string): Promise<any | null> {
    const intentionActionStr = await this.client.get(
      `${ACTION_PREFIX}${token}`,
    );
    return intentionActionStr ? JSON.parse(intentionActionStr) : null;
  }

  public async closeIntention(token: string): Promise<boolean> {
    const intention = await this.getIntention(token);
    if (intention) {
      for (const action of intention.actions) {
        const closeResult = await this.closeIntentionAction(
          action.transaction.token,
        );
        if (!closeResult) {
          return false;
        }
      }
    }
    return (await this.client.del(`${INTENTION_PREFIX}${token}`)) === 1;
  }

  public async closeIntentionAction(token: string): Promise<boolean> {
    return (await this.client.del(`${ACTION_PREFIX}${token}`)) === 1;
  }
}
