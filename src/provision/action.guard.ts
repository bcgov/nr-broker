import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { HEADER_BROKER_TOKEN } from '../constants';
import { PersistenceService } from '../persistence/persistence.service';
import { ActionDto } from '../intention/dto/action.dto';
import { ActionGuardRequest } from './action-guard-request.interface';

@Injectable()
export class ActionGuard implements CanActivate {
  constructor(private persistenceService: PersistenceService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ActionGuardRequest>();
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];

    const action: ActionDto = await this.persistenceService.getIntentionAction(
      token,
    );
    request.brokerActionDto = action;
    return !!action;
  }
}
