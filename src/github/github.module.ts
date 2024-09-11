import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { VaultModule } from '../vault/vault.module';
import { RedisModule } from '../redis/redis.module';
import { GithubHealthIndicator } from './github.health';

@Module({
  imports: [VaultModule, RedisModule],
  providers: [GithubService, GithubHealthIndicator],
  exports: [GithubService, GithubHealthIndicator],
})
export class GithubModule {}
