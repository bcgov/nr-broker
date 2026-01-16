import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { GithubService } from './github.service';
import { GithubSyncService } from './github-sync.service';
import { GithubHealthIndicator } from './github.health';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { GraphModule } from '../graph/graph.module';
import { VaultModule } from '../vault/vault.module';
import { UtilModule } from '../util/util.module';

@Module({
  imports: [
    AuditModule,
    GraphModule,
    PersistenceModule,
    RedisModule,
    TerminusModule,
    VaultModule,
    UtilModule,
  ],
  providers: [GithubService, GithubSyncService, GithubHealthIndicator],
  exports: [GithubService, GithubSyncService, GithubHealthIndicator],
})
export class GithubModule {}
