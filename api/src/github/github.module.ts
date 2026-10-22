import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { GithubService } from './github.service';
import { GithubSyncService } from './github-sync.service';
import { GithubTokenService } from './github-token.service';
import { GithubCatalogService } from './github-catalog.service';
import { GithubCatalogFileReader } from './github-catalog-file-reader.service';
import { GithubCatalogOrgScanner } from './github-catalog-org-scanner.service';
import { GithubController } from './github.controller';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { GraphModule } from '../graph/graph.module';
import { VaultModule } from '../vault/vault.module';
import { UtilModule } from '../util/util.module';
import { BullModule } from '../bull/bull.module';

@Module({
  imports: [
    AuditModule,
    GraphModule,
    PersistenceModule,
    RedisModule,
    TerminusModule,
    VaultModule,
    UtilModule,
    BullModule,
  ],
  controllers: [GithubController],
  providers: [
    GithubService,
    GithubSyncService,
    GithubTokenService,
    GithubCatalogService,
    GithubCatalogFileReader,
    GithubCatalogOrgScanner,
  ],
  exports: [
    GithubService,
    GithubSyncService,
    GithubTokenService,
    GithubCatalogService,
  ],
})
export class GithubModule {}
