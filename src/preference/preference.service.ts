import { Injectable } from '@nestjs/common';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { PreferenceDto } from '../persistence/dto/preference.dto';
import { PreferenceEntity } from '../persistence/entity/preference.entity';

@Injectable()
export class PreferenceService {
  constructor(private readonly systemRepository: SystemRepository) {}

  async getPreferences(guid: string): Promise<PreferenceDto> {
    const pref = await this.systemRepository.getPreferences(guid);
    return pref
      ? pref.toRestDto()
      : Promise.resolve(new PreferenceEntity().toRestDto());
  }

  async setPreferences(guid: string, preference: PreferenceDto) {
    return this.systemRepository.setPreferences(guid, preference);
  }
}
