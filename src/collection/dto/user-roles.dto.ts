import { get } from 'radash';
import { UserImportDto } from './user-import.dto';
import {
  OAUTH2_CLIENT_MAP_DOMAIN,
  OAUTH2_CLIENT_MAP_EMAIL,
  OAUTH2_CLIENT_MAP_GUID,
  OAUTH2_CLIENT_MAP_NAME,
  OAUTH2_CLIENT_MAP_USERNAME,
  OAUTH2_CLIENT_MAP_ROLES,
  OAUTH2_CLIENT_DOMAIN,
} from '../../constants';

export class UserRolesDto extends UserImportDto {
  roles!: string[];

  constructor(
    public vertex: string,
    userInfo: any,
  ) {
    super();
    // Map or use static value
    this.domain = OAUTH2_CLIENT_MAP_DOMAIN
      ? get(userInfo, OAUTH2_CLIENT_MAP_DOMAIN)
      : OAUTH2_CLIENT_DOMAIN;
    this.email = get(userInfo, OAUTH2_CLIENT_MAP_EMAIL);
    this.guid = get(userInfo, OAUTH2_CLIENT_MAP_GUID);
    this.name = get(userInfo, OAUTH2_CLIENT_MAP_NAME);
    this.roles = get(userInfo, OAUTH2_CLIENT_MAP_ROLES, []);
    this.username = get(userInfo, OAUTH2_CLIENT_MAP_USERNAME, '').toLowerCase();
  }

  toUserImportDto(): UserImportDto {
    const dto: UserRolesDto = {
      ...this,
    };
    delete dto.roles;
    return dto;
  }
}
