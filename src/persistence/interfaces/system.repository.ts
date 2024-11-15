import { ConnectionConfigEntity } from '../dto/connection-config.entity';
import { GroupRegistryByAccountDto } from '../dto/group-registry-by-account.dto';
import { JwtRegistryEntity } from '../dto/jwt-registry.entity';
import { PreferenceRestDto } from '../dto/preference-rest.dto';
import { PreferenceEntity } from '../dto/preference.entity';

export abstract class SystemRepository {
  public abstract jwtMatchesAllowed(jwt: any): Promise<boolean>;
  public abstract jwtMatchesBlocked(jwt: any): Promise<boolean>;
  public abstract addJwtToRegister(
    accountId: string,
    payload: any,
    creator: string,
  ): Promise<boolean>;
  public abstract getRegisteryJwts(
    accountId: string,
  ): Promise<JwtRegistryEntity[]>;
  public abstract getRegisteryJwtByClaimJti(
    jti: string,
  ): Promise<JwtRegistryEntity>;
  public abstract findExpiredRegistryJwts(
    currentTime: number,
  ): Promise<JwtRegistryEntity[]>;
  public abstract deleteRegistryJwt(jwt: JwtRegistryEntity): Promise<boolean>;
  public abstract groupRegistryByAccountId(): Promise<
    GroupRegistryByAccountDto[]
  >;
  public abstract blockJwtByJti(jti: string): Promise<boolean>;
  public abstract getPreferences(guid: string): Promise<PreferenceEntity>;
  public abstract setPreferences(
    guid: string,
    preference: PreferenceRestDto,
  ): Promise<boolean>;

  public abstract getConnectionConfigs(): Promise<ConnectionConfigEntity[]>;
  public abstract generateUserAliasRequestState(
    accountId: string,
    domain: string,
  ): Promise<string>;
  public abstract getUserAliasRequestState(
    accountId: string,
    domain: string,
  ): Promise<string>;
}
