import { Injectable, inject } from '@angular/core';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserPermissionDto } from './persistence/dto/user-permission.dto';
import { UserSelfDto } from './persistence/dto/user.dto';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  readonly user = inject<UserSelfDto>(CURRENT_USER);

  private hasAdminPermission: boolean;
  private hasTeamAdminPermission: boolean;
  constructor() {
    const user = this.user;

    this.hasAdminPermission = !!user?.roles?.includes('admin');
    this.hasTeamAdminPermission = !!user?.roles?.includes('team_admin');
  }

  public hasAdmin() {
    return this.hasAdminPermission;
  }

  public hasTeamAdmin() {
    return this.hasTeamAdminPermission;
  }

  public hasSudo(permissions: UserPermissionDto, vertex: string) {
    if (!permissions) {
      return false;
    }
    return this.hasAdminPermission || permissions.sudo.indexOf(vertex) !== -1;
  }

  public hasUpdate(permissions: UserPermissionDto, vertex: string) {
    if (!permissions) {
      return false;
    }
    return this.hasAdminPermission || permissions.update.indexOf(vertex) !== -1;
  }

  public hasDelete(permissions: UserPermissionDto, vertex: string) {
    if (!permissions) {
      return false;
    }
    return this.hasAdminPermission || permissions.delete.indexOf(vertex) !== -1;
  }

  public hasApprove(permissions: UserPermissionDto, vertex: string) {
    if (!permissions) {
      return false;
    }
    return (
      this.hasAdminPermission || permissions.approve.indexOf(vertex) !== -1
    );
  }
}
