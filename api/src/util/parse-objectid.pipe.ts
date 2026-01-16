import { Injectable, PipeTransform, HttpStatus } from '@nestjs/common';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '@nestjs/common/utils/http-error-by-code.util';
import { ObjectId } from 'mongodb';

export interface ParseObjectIdPipeOptions {
  /**
   * If true, the pipe will return null or undefined if the value is not provided
   * @default false
   */
  optional?: boolean;
  /**
   * Default value for the date
   */
  default?: () => string;
  /**
   * The HTTP status code to be used in the response when the validation fails.
   */
  errorHttpStatusCode?: ErrorHttpStatusCode;
  /**
   * A factory function that returns an exception object to be thrown
   * if validation fails.
   * @param error Error message
   * @returns The exception object
   */
  exceptionFactory?: (error: string) => any;
}

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string | number | undefined | null> {
  protected exceptionFactory: (error: string) => any;

  constructor(private readonly options: ParseObjectIdPipeOptions = {}) {
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } =
      options;

    this.exceptionFactory =
      exceptionFactory ||
      ((error) => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  transform(value: string | undefined | null): string | null | undefined {
    if (this.options.optional && value === undefined) {
      return this.options.default ? this.options.default() : value;
    }

    if (!value) {
      throw this.exceptionFactory('Validation failed (no id provided)');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const transformedValue = new ObjectId(value);
    } catch (error) {
      throw this.exceptionFactory(
        `Validation failed (ObjectId: ${value} is not a valid ObjectId)`,
      );
    }

    return value;
  }
}
