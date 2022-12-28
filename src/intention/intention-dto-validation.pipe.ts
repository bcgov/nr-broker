import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { IntentionDto } from './dto/intention.dto';
import { UnknownActionBadRequestException } from './dto/unknown-action-bad-request.exception';

@Injectable()
export class IntentionDtoValidationPipe implements PipeTransform {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    // Validate as a generic intention
    try {
      const object = IntentionDto.plainToInstance(value);
      const errors = await validate(object, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      });
      if (errors.length > 0) {
        throw new BadRequestException('Validation failed');
      }
      return object;
    } catch (error) {
      if (error instanceof UnknownActionBadRequestException) {
        throw error;
      }
      throw new BadRequestException('Validation failed');
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private toValidate(metatype: Function): boolean {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
