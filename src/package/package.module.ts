import { Module } from '@nestjs/common';
import { PackageController } from './package.controller';
import { PackageService } from './package.service';
import { AuditModule } from '../audit/audit.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [AuditModule, PersistenceModule, RedisModule],
  controllers: [PackageController],
  providers: [PackageService],
})
export class PackageModule {}
