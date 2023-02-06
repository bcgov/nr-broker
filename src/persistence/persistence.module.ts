import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntentionDto } from '../intention/dto/intention.dto';
import { PersistenceService } from './persistence.service';

@Module({
  imports: [TypeOrmModule.forFeature([IntentionDto])],
  providers: [PersistenceService],
  exports: [PersistenceService],
})
export class PersistenceModule {}
