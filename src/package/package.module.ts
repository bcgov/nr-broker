import { Module } from '@nestjs/common';
import { PackageController } from './package.controller';
import { PackageService } from './package.service';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [AuditModule, PersistenceModule],
  controllers: [PackageController],
  providers: [PackageService],
})
export class PackageModule {}
