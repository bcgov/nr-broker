import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntentionDto } from '../intention/dto/intention.dto';
import { JwtAllowDto } from './dto/jwt-allow.dto';
import { JwtBlockDto } from './dto/jwt-block.dto';
import { IntentionRepository } from './interfaces/intention.repository';
import { JwtValidationRepository } from './interfaces/jwt-validation.reposity';
import { IntentionMongoRepository } from './mongo/intention-mongo.repository';
import { JwtValidationMongoRepository } from './mongo/jwt-validation-mongo.reposity';

@Module({
  imports: [TypeOrmModule.forFeature([IntentionDto, JwtAllowDto, JwtBlockDto])],
  providers: [
    IntentionMongoRepository,
    { provide: IntentionRepository, useExisting: IntentionMongoRepository },
    JwtValidationMongoRepository,
    {
      provide: JwtValidationRepository,
      useExisting: JwtValidationMongoRepository,
    },
  ],
  exports: [IntentionRepository, JwtValidationRepository],
})
export class PersistenceModule {}
