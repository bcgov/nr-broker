import { Injectable } from '@nestjs/common';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { PreferenceDto } from '../persistence/dto/preference.dto';
import { PreferenceEntity } from '../persistence/entity/preference.entity';

@Injectable()
export class PreferenceService {
  constructor(private readonly systemRepository: SystemRepository) {}

  async getPreferences(guid: string): Promise<PreferenceEntity> {
    const pref = await this.systemRepository.getPreferences(guid);
    return pref ?? new PreferenceEntity(guid);
  }

  async setPreferences(guid: string, dto: PreferenceDto) {
    const preference = await this.getPreferences(guid);
    preference.setFromDto(dto);
    return this.systemRepository.setPreferences(preference);
  }
}
