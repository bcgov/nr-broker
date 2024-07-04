import { Inject, Injectable } from '@angular/core';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from './graph.types';
import { UserPermissionRestDto } from './dto/user-permission-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  constructor(@Inject(CURRENT_USER) private readonly user: UserDto) {}

  public hasSudo(permissions: UserPermissionRestDto, vertex: string) {
    return (
      this.user.roles.includes('admin') ||
      permissions.sudo.indexOf(vertex) !== -1
    );
  }

  public hasUpdate(permissions: UserPermissionRestDto, vertex: string) {
    return (
      this.user.roles.includes('admin') ||
      permissions.update.indexOf(vertex) !== -1
    );
  }

  public hasDelete(permissions: UserPermissionRestDto, vertex: string) {
    return (
      this.user.roles.includes('admin') ||
      permissions.delete.indexOf(vertex) !== -1
    );
  }

  public hasApprove(permissions: UserPermissionRestDto, vertex: string) {
    return (
      this.user.roles.includes('admin') ||
      permissions.approve.indexOf(vertex) !== -1
    );
  }
}
