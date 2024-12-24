import { Injectable } from '@nestjs/common';
import { ValidationError } from 'class-validator';

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
