import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TokenModule } from '../token/token.module';
import { ProvisionController } from './provision.controller';
import { ProvisionService } from './provision.service';
import { IntentionModule } from '../intention/intention.module';
import { BullModule } from '../bull/bull.module';
import { VaultModule } from '../vault/vault.module';

/**
 * The provision module proxies access to Vault APIs. Access is controlled by
 * tokens provied in the response to a successful intention open.
 */
@Module({
  imports: [AuthModule, TokenModule, AuditModule, IntentionModule, PersistenceModule, BullModule, VaultModule],
  controllers: [ProvisionController],
  providers: [ProvisionService],
})
export class ProvisionModule {}
