import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [PersistenceModule, GraphModule],
  controllers: [CollectionController],
  providers: [CollectionService],
})
export class CollectionModule {}
