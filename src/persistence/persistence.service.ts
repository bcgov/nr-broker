import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class PersistenceService {
  constructor(@Inject('REDIS_CLIENT') private client: RedisClientType) {}

  public async testredis() {
    await this.client.set('key', 'value');
    const value = await this.client.get('key');
    return value;
  }
}
