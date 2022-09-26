import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

const INTENTION_PREFIX = 'int-';

@Injectable()
export class PersistenceService {
  constructor(@Inject('REDIS_CLIENT') private client: RedisClientType) {}

  public async addIntention(
    id: string,
    intention: object,
    ttl: number,
  ): Promise<any> {
    return this.client.set(
      `${INTENTION_PREFIX}${id}`,
      JSON.stringify(intention),
      {
        EX: ttl,
      },
    );
  }

  public async getIntention(id: string): Promise<any | null> {
    const intentionStr = await this.client.get(`${INTENTION_PREFIX}${id}`);
    return intentionStr ? JSON.parse(intentionStr) : null;
  }

  public async closeIntention(
    id: string,
    outcome: 'failure' | 'success' | 'unknown',
    reason: string | undefined,
  ): Promise<boolean> {
    return (await this.client.del(`${INTENTION_PREFIX}${id}`)) === 1;
  }
}
