import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { HEADER_BROKER_TOKEN } from '../constants';
import { ActionGuardRequest } from './action-guard-request.interface';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { IntentionDto } from '../intention/dto/intention.dto';

@Injectable()
export class ActionGuard implements CanActivate {
  constructor(private intentionRepository: IntentionRepository) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ActionGuardRequest>();
    const tokenHeader = request.headers[HEADER_BROKER_TOKEN];
    const token =
      typeof tokenHeader === 'string' ? tokenHeader : tokenHeader[0];

    const intention = IntentionDto.plainToInstance(
      await this.intentionRepository.getIntentionByActionToken(token),
    );
    const action = IntentionDto.projectAction(intention, token);
    const errors = await validate(action, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      // console.log(errors[0].children);
      throw new BadRequestException('Validation failed');
    }
    request.brokerIntentionDto = intention;
    request.brokerActionDto = action;
    return !!action;
  }
}
