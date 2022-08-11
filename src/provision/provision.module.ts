import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TokenModule } from '../token/token.module';
import { ProvisionController } from './provision.controller';
import { ProvisionService } from './provision.service';

@Module({
  imports: [TokenModule, AuditModule],
  controllers: [ProvisionController],
  providers: [ProvisionService],
})
export class ProvisionModule {}
