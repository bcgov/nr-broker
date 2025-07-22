import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HEADER_BROKER_TOKEN } from '../constants';
import { ActionGuardRequest } from './action-guard-request.interface';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { IntentionEntity } from './entity/intention.entity';

@Injectable()
export class ActionGuard implements CanActivate {
  constructor(private intentionRepository: IntentionRepository) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ActionGuardRequest>();
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    if (tokenHeader === undefined) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Missing header for action token: ${HEADER_BROKER_TOKEN}`,
      });
    }
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];
    const intObj =
      await this.intentionRepository.getIntentionByActionToken(token);
    if (!intObj) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Intention not found',
      });
    }
    const action = IntentionEntity.projectAction(intObj, token);
    if (!action) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Action not found',
      });
    }
    request.brokerIntention = intObj;
    request.brokerAction = action;
    return !!action;
  }
}
