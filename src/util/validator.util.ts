import { Injectable } from '@nestjs/common';
import {
  ValidationError,
  ValidationOptions,
  isHash,
  registerDecorator,
} from 'class-validator';

export function IsValidHash(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidHash',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          return (
            typeof value === 'string' && !isHash.call(null, value.split(':'))
          );
        },
      },
    });
  };
}

export function IsValidProp(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidProp',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          return (
            typeof value === 'object' &&
            Object.entries(value).every(([k, v]) => {
              return (
                typeof k === 'string' &&
                (typeof v === 'string' || v instanceof String)
              );
            })
          );
        },
      },
    });
  };
}

@Injectable()
export class ValidatorUtil {
  public buildFirstFailedPropertyErrorMsg(err: ValidationError) {
    let prop = '';
    let constraints: unknown;
    for (let cErr = err; cErr; cErr = cErr.children[0]) {
      if (Array.isArray(cErr.target)) {
        prop = `${prop}[${cErr.property}]`;
      } else {
        prop = `${prop}.${cErr.property}`;
      }
      constraints = cErr.constraints;
      if (!cErr.children) {
        break;
      }
    }
    return `Property ${prop} has failed the following constraints: ${
      constraints ? Object.keys(constraints).join(', ') : 'unknown'
    }`;
  }
}
