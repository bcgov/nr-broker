import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { VaultModule } from '../vault/vault.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [VaultModule, RedisModule],
  providers: [GithubService],
})
export class GithubModule {}
