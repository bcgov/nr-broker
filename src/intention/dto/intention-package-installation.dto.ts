import { plainToInstance } from 'class-transformer';
import { Equals } from 'class-validator';
import { EventDto, IntentionDto } from './intention.dto';

export class InstallEventDto extends EventDto {
  @Equals('package')
  category: string;

  @Equals('installation')
  type: string;
}

export class IntentionPackageInstallationDto extends IntentionDto {
  static plainToInstance(value: any): IntentionPackageInstallationDto {
    const object = plainToInstance(
      IntentionPackageInstallationDto,
      IntentionDto.plainToInstance(value),
    );

    if (object.event) {
      object.event = plainToInstance(InstallEventDto, object.event);
    }

    return object;
  }
}
