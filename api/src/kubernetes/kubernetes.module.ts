import { Module } from '@nestjs/common';
import { KubernetesSyncService } from './kubernetes-sync.service';
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
    VaultModule,
    UtilModule,
  ],
  providers: [KubernetesSyncService],
  exports: [KubernetesSyncService],
})
export class KubernetesModule {}
