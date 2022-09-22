import { Logger, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { PersistenceService } from './persistence.service';

const redisFactory = {
  provide: 'REDIS_CLIENT',
  useFactory: async () => {
    const host = process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost';
    const port = process.env.REDIS_PORT ? process.env.REDIS_PORT : '6379';
    const username = process.env.REDIS_USER ? process.env.REDIS_USER : '';
    const password = process.env.REDIS_PASSWORD
      ? `:${process.env.REDIS_PASSWORD}`
      : '';
    const url = `redis://${username}${password}${
      username.length > 0 || password.length > 0 ? '@' : ''
    }${host}:${port}`;
    const client = createClient({
      url,
    });
    client.on('error', (err) => {
      logger.error('Redis client error');
      logger.error(err);
    });

    await client.connect();
    logger.log('Redis client connected');
    return client;
  },
};

@Module({
  providers: [PersistenceService, redisFactory],
  exports: [PersistenceService],
})
export class PersistenceModule {}
const logger = new Logger(PersistenceModule.name);
