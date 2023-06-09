import { GroupRegistryByAccountDto } from '../dto/group-registry-by-account.dto';
import { JwtRegistryDto } from '../dto/jwt-registry.dto';
import { PreferenceRestDto } from '../dto/preference-rest.dto';
import { PreferenceDto } from '../dto/preference.dto';

export abstract class SystemRepository {
  public abstract jwtMatchesAllowed(jwt: any): Promise<boolean>;
  public abstract jwtMatchesBlocked(jwt: any): Promise<boolean>;
  public abstract addJwtToRegister(
    accountId: string,
    payload: any,
    creator: string,
  ): Promise<boolean>;
  public abstract findExpiredAccounts(
    currentTime: number,
  ): Promise<JwtRegistryDto[]>;
  public abstract deleteRegistryJwt(jwt: JwtRegistryDto): Promise<boolean>;
  public abstract groupRegistryByAccountId(): Promise<
    GroupRegistryByAccountDto[]
  >;
  public abstract blockJwtByJti(jti: string): Promise<boolean>;
  public abstract getPreferences(guid: string): Promise<PreferenceDto>;
  public abstract setPreferences(
    guid: string,
    preference: PreferenceRestDto,
  ): Promise<boolean>;
}
