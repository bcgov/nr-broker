import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { TokenModule } from 'src/token/token.module';
import { ProvisionController } from './provision.controller';
import { ProvisionService } from './provision.service';

@Module({
  imports: [TokenModule, AuditModule],
  controllers: [ProvisionController],
  providers: [ProvisionService],
})
export class ProvisionModule {}
