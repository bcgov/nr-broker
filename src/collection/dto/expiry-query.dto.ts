import { Type } from 'class-transformer';
import { IsInt, Max } from 'class-validator';
import { DAYS_365_IN_SECONDS } from '../../constants';

export class ExpiryQuery {
  @IsInt()
  @Max(DAYS_365_IN_SECONDS)
  @Type(() => Number)
  expiration: number;
}
