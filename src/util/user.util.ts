import { Injectable } from '@nestjs/common';
import get from 'lodash.get';
import {
  OAUTH2_CLIENT_MAP_DOMAIN,
  OAUTH2_CLIENT_MAP_EMAIL,
  OAUTH2_CLIENT_MAP_GUID,
  OAUTH2_CLIENT_MAP_NAME,
  OAUTH2_CLIENT_MAP_USERNAME,
  OAUTH2_CLIENT_MAP_ROLES,
  OAUTH2_CLIENT_DOMAIN,
} from '../constants';
import { UserRolesDto } from '../collection/dto/user-roles.dto';
import { UserAliasEmbeddable } from '../persistence/entity/user.entity';

@Injectable()
export class UserUtil {
  public mapUserToUserRolesDto(
    vertex: string,
    userInfo: any,
    alias: UserAliasEmbeddable[] | undefined = undefined,
  ) {
    const userRoles = new UserRolesDto(vertex);

    userRoles.domain = OAUTH2_CLIENT_MAP_DOMAIN
      ? get(userInfo, OAUTH2_CLIENT_MAP_DOMAIN)
      : OAUTH2_CLIENT_DOMAIN;
    userRoles.email = get(userInfo, OAUTH2_CLIENT_MAP_EMAIL);
    userRoles.guid = get(userInfo, OAUTH2_CLIENT_MAP_GUID);
    userRoles.name = get(userInfo, OAUTH2_CLIENT_MAP_NAME);
    userRoles.roles = get(userInfo, OAUTH2_CLIENT_MAP_ROLES, []);
    userRoles.username = get(
      userInfo,
      OAUTH2_CLIENT_MAP_USERNAME,
      '',
    ).toLowerCase();
    if (alias) {
      userRoles.alias = alias;
    }
    return userRoles;
  }
}
