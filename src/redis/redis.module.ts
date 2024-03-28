import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisService } from './redis.service';

@Module({
  imports: [PersistenceModule],
  controllers: [],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
