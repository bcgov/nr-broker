import { Module } from '@nestjs/common';
import { PackageController } from './package.controller';
import { PackageService } from './package.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { UtilModule } from '../util/util.module';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    PersistenceModule,
    RedisModule,
    UtilModule,
  ],
  controllers: [PackageController],
  providers: [PackageService],
})
export class PackageModule {}
