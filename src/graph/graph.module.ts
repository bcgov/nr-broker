import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, AuditModule, PersistenceModule],
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
