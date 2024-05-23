import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [PersistenceModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
