import { Injectable } from '@nestjs/common';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { PreferenceRestDto } from '../persistence/dto/preference-rest.dto';
import { PreferenceDto } from '../persistence/dto/preference.dto';

@Injectable()
export class PreferenceService {
  constructor(private readonly systemRepository: SystemRepository) {}

  async getPreferences(guid: string): Promise<PreferenceRestDto> {
    const pref = await this.systemRepository.getPreferences(guid);
    return pref
      ? pref.toRestDto()
      : Promise.resolve(new PreferenceDto().toRestDto());
  }

  async setPreferences(guid: string, preference: PreferenceRestDto) {
    return this.systemRepository.setPreferences(guid, preference);
  }
}
