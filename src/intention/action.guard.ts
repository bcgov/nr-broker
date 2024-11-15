import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { HEADER_BROKER_TOKEN } from '../constants';
import { ActionGuardRequest } from './action-guard-request.interface';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { IntentionEntity } from './dto/intention.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ActionGuard implements CanActivate {
  constructor(private intentionRepository: IntentionRepository) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ActionGuardRequest>();
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
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
    const intention = plainToInstance(IntentionEntity, intObj);
    const action = IntentionEntity.projectAction(intention, token);
    const errors = await validate(action, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      // console.log(errors[0].children);
      throw new BadRequestException('Validation failed');
    }
    request.brokerIntentionEntity = intention;
    request.brokerActionDto = action;
    return !!action;
  }
}
