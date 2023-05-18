import { PreferenceRestDto } from '../dto/preference-rest.dto';
import { PreferenceDto } from '../dto/preference.dto';

export abstract class SystemRepository {
  public abstract jwtMatchesAllowed(jwt: any): Promise<boolean>;
  public abstract jwtMatchesBlocked(jwt: any): Promise<boolean>;
  public abstract getPreferences(guid: string): Promise<PreferenceDto>;
  public abstract setPreferences(
    guid: string,
    preference: PreferenceRestDto,
  ): Promise<boolean>;
}
