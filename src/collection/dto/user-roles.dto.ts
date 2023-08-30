import { get } from 'radash';
import { UserImportDto } from './user-import.dto';
import {
  OAUTH2_CLIENT_MAP_EMAIL,
  OAUTH2_CLIENT_MAP_GUID,
  OAUTH2_CLIENT_MAP_NAME,
  OAUTH2_CLIENT_MAP_USERNAME,
  OAUTH2_CLIENT_MAP_ROLES,
} from '../../constants';

export class UserRolesDto extends UserImportDto {
  roles!: string[];

  constructor(
    public vertex: string,
    userInfo: any,
  ) {
    super();
    this.email = get(userInfo, OAUTH2_CLIENT_MAP_EMAIL);
    this.guid = get(userInfo, OAUTH2_CLIENT_MAP_GUID);
    this.name = get(userInfo, OAUTH2_CLIENT_MAP_NAME);
    this.username = get(userInfo, OAUTH2_CLIENT_MAP_USERNAME, '').toLowerCase();
    this.roles = get(userInfo, OAUTH2_CLIENT_MAP_ROLES, []);
  }

  toUserImportDto(): UserImportDto {
    const dto: UserRolesDto = {
      ...this,
    };
    delete dto.roles;
    return dto;
  }
}
