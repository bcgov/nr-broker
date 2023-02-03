import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { HEADER_BROKER_TOKEN } from '../constants';
import { PersistenceService } from '../persistence/persistence.service';
import { ActionGuardRequest } from './action-guard-request.interface';
import { actionFactory } from '../intention/dto/action.util';

@Injectable()
export class ActionGuard implements CanActivate {
  constructor(private persistenceService: PersistenceService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ActionGuardRequest>();
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];

    const action = actionFactory(
      await this.persistenceService.getIntentionActionByToken(token),
    );
    const errors = await validate(action, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      // console.log(errors[0].children);
      throw new BadRequestException('Validation failed');
    }
    request.brokerActionDto = action;
    return !!action;
  }
}
