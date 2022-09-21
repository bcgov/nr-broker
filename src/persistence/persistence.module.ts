import { Logger, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { PersistenceService } from './persistence.service';

const redisFactory = {
  provide: 'REDIS_CLIENT',
  useFactory: async () => {
    const client = createClient();
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
