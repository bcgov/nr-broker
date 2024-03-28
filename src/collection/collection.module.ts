import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { GraphModule } from '../graph/graph.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { AccountService } from './account.service';
import { UserCollectionService } from './user-collection.service';
import { TokenModule } from '../token/token.module';
import { UtilModule } from '../util/util.module';
import { IntentionModule } from '../intention/intention.module';
import { RedisModule } from '../redis/redis.module';

/**
 * The collection module enables the viewing and manipulation of the objects
 * attached to the graph vertices in broker.
 */
@Module({
  imports: [
    AuditModule,
    AuthModule,
    PersistenceModule,
    GraphModule,
    forwardRef(() => IntentionModule),
    RedisModule,
    TokenModule,
    UtilModule,
  ],
  controllers: [CollectionController],
  providers: [CollectionService, UserCollectionService, AccountService],
  exports: [CollectionService, UserCollectionService],
})
export class CollectionModule {}
