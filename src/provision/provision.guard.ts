import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PersistenceService } from '../persistence/persistence.service';
import { RoleGuardRequest } from './vault-role.guard';

@Injectable()
export class ProvisionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private persistenceService: PersistenceService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>(
      'provision',
      context.getHandler(),
    );
    if (!roles) {
      return false;
    }
    const request = context.switchToHttp().getRequest<RoleGuardRequest>();
    const action = request.brokerActionDto;
    return roles.every((role) => action?.provision.includes(role));
  }
}
