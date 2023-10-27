import { Injectable } from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidatorUtil {
  public buildFirstFailedPropertyErrorMsg(err: ValidationError) {
    let prop = '';
    let constraints: unknown;
    for (let cErr = err; cErr; cErr = cErr.children ? cErr.children[0] : cErr) {
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
}
