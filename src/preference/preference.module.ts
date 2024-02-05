import { Module } from '@nestjs/common';
import { PreferenceController } from './preference.controller';
import { PreferenceService } from './preference.service';
import { PersistenceModule } from '../persistence/persistence.module';

/**
 * The preference module supports the user by persisting their preferences.
 */
@Module({
  imports: [PersistenceModule],
  controllers: [PreferenceController],
  providers: [PreferenceService],
})
export class PreferenceModule {}
