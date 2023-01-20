import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
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
        throw new BadRequestException({
          statusCode: 400,
          message: 'Intention validation error',
          error: this.buildFirstFailedPropertyErrorMsg(errors[0]),
        });
      }
      return object;
    } catch (error) {
      if (
        error instanceof UnknownActionBadRequestException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Validation failed');
    }
  }

  private buildFirstFailedPropertyErrorMsg(err: ValidationError) {
    let prop = '';
    let constraints: unknown;
    for (let cErr = err; cErr; cErr = cErr.children[0]) {
      if (Array.isArray(cErr.target)) {
        prop = `${prop}[${cErr.property}]`;
      } else {
        prop = `${prop}.${cErr.property}`;
      }
      constraints = cErr.constraints;
    }
    return `Property ${prop} has failed the following constraints: ${
      constraints ? Object.keys(constraints).join(', ') : 'unknown'
    }`;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private toValidate(metatype: Function): boolean {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
