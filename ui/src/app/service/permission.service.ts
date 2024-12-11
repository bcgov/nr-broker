import { Inject, Injectable } from '@angular/core';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserPermissionDto } from './dto/user-permission.dto';
import { UserSelfDto } from './dto/user.dto';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private hasAdminPermission: boolean;
  constructor(@Inject(CURRENT_USER) readonly user: UserSelfDto) {
    this.hasAdminPermission = !!user?.roles?.includes('admin');
  }

  public hasAdmin() {
    return this.hasAdminPermission;
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
