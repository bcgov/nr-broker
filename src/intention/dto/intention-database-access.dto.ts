import { plainToInstance } from 'class-transformer';
import { Equals } from 'class-validator';
import { EventDto, IntentionDto } from './intention.dto';

export class DatabaseEventDto extends EventDto {
  @Equals('database')
  category: string;

  @Equals('access')
  type: string;
}

export class IntentionDatabaseAccessDto extends IntentionDto {
  static plainToInstance(value: any): IntentionDatabaseAccessDto {
    const object = plainToInstance(
      IntentionDatabaseAccessDto,
      IntentionDto.plainToInstance(value),
    );

    if (object.event) {
      object.event = plainToInstance(DatabaseEventDto, object.event);
    }

    return object;
  }
}
