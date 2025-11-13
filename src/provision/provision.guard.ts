import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuardRequest } from './vault-role.guard';

/**
 * Guards paths by checking if the action associated with the request is
 * permitted to provision based on the provision metadata.
 */
@Injectable()
export class ProvisionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>(
      'provision',
      context.getHandler(),
    );
    if (!roles) {
      return false;
    }
    const request = context.switchToHttp().getRequest<RoleGuardRequest>();
    const action = request.brokerAction;
    return roles.every((role) => action?.provision.includes(role));
  }
}
