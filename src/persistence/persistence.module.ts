import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntentionDto } from '../intention/dto/intention.dto';
import { IntentionRepository } from './interfaces/intention.repository';
import { IntentionMongoRepository } from './mongo/intention-mongo.repository';

@Module({
  imports: [TypeOrmModule.forFeature([IntentionDto])],
  providers: [
    IntentionMongoRepository,
    { provide: IntentionRepository, useExisting: IntentionMongoRepository },
  ],
  exports: [IntentionRepository],
})
export class PersistenceModule {}
