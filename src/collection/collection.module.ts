import { Module, forwardRef } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { AccountService } from './account.service';
import { UserCollectionService } from './user-collection.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AwsModule } from '../aws/aws.module';
import { GithubModule } from '../github/github.module';
import { GraphModule } from '../graph/graph.module';
import { IntentionModule } from '../intention/intention.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { TokenModule } from '../token/token.module';
import { UtilModule } from '../util/util.module';
import { RedisModule } from '../redis/redis.module';
import { VaultModule } from '../vault/vault.module';
import { TeamCollectionService } from './team-collection.service';
import { RepositoryCollectionService } from './repository-collection.service';
import { CommunicationModule } from 'src/communication/communication.module';

/**
 * The collection module enables the viewing and manipulation of the objects
 * attached to the graph vertices in broker.
 */
@Module({
  imports: [
    AwsModule,
    AuditModule,
    AuthModule,
    PersistenceModule,
    GithubModule,
    GraphModule,
    forwardRef(() => IntentionModule),
    RedisModule,
    TokenModule,
    UtilModule,
    VaultModule,
    CommunicationModule,
  ],
  controllers: [CollectionController],
  providers: [
    AccountService,
    CollectionService,
    RepositoryCollectionService,
    TeamCollectionService,
    UserCollectionService,
  ],
  exports: [CollectionService, UserCollectionService],
})
export class CollectionModule {}
