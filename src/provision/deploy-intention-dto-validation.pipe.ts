import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  EventDto,
  LabelsDto,
  ServiceDto,
  UserDto,
} from './deploy-intention.dto';

@Injectable()
export class DeployIntentionDtoValidationPipe implements PipeTransform {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    if (object.event) {
      object.event = plainToInstance(EventDto, object.event);
    }
    if (object.labels) {
      object.labels = plainToInstance(LabelsDto, object.labels);
    }
    if (object.service) {
      object.service = plainToInstance(ServiceDto, object.service);
    }
    if (object.user) {
      object.user = plainToInstance(UserDto, object.user);
    }
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    return value;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private toValidate(metatype: Function): boolean {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
