import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

const INTENTION_PREFIX = 'int-';
export const INTENTION_EXPIRE_SECONDS = 600;

@Injectable()
export class PersistenceService {
  constructor(@Inject('REDIS_CLIENT') private client: RedisClientType) {}

  public async testredis() {
    await this.client.set('key', 'value');
    const value = await this.client.get('key');
    return value;
  }

  public async addIntention(id: string, intention: object): Promise<any> {
    return this.client.set(
      `${INTENTION_PREFIX}${id}`,
      JSON.stringify(intention),
      {
        EX: INTENTION_EXPIRE_SECONDS,
      },
    );
  }

  public async getIntention(id: string): Promise<any | null> {
    const intentionStr = await this.client.get(`${INTENTION_PREFIX}${id}`);
    return intentionStr ? JSON.parse(intentionStr) : null;
  }

  public async finalizeIntention(id: string): Promise<boolean> {
    return (await this.client.del(`${INTENTION_PREFIX}${id}`)) === 1;
  }
}
