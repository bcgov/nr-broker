import { plainToInstance } from 'class-transformer';
import { Equals } from 'class-validator';
import { EventDto, IntentionDto } from './intention.dto';

export class AuthenticationEventDto extends EventDto {
  @Equals('authentication')
  category: string;
}

export class IntentionAuthenticationDto extends IntentionDto {
  static plainToInstance(value: any): IntentionAuthenticationDto {
    const object = plainToInstance(
      IntentionAuthenticationDto,
      IntentionDto.plainToInstance(value),
    );

    if (object.event) {
      object.event = plainToInstance(AuthenticationEventDto, object.event);
    }

    return object;
  }
}
