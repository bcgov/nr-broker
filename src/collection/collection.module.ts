import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { GraphModule } from '../graph/graph.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { AccountService } from './account.service';

@Module({
  imports: [AuditModule, AuthModule, PersistenceModule, GraphModule],
  controllers: [CollectionController],
  providers: [CollectionService, AccountService],
})
export class CollectionModule {}
