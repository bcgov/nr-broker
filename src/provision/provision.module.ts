import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuditModule } from '../audit/audit.module';
import { TokenModule } from '../token/token.module';
import { ProvisionController } from './provision.controller';
import { ProvisionService } from './provision.service';
import { IntentionModule } from '../intention/intention.module';
import { AccountService } from '../collection/account.service';

@Module({
  imports: [TokenModule, AuditModule, IntentionModule, PersistenceModule],
  controllers: [ProvisionController],
  providers: [ProvisionService, AccountService],
})
export class ProvisionModule {}
