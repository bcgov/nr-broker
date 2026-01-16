import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GithubModule } from '../github/github.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [AuthModule, PersistenceModule, GithubModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
