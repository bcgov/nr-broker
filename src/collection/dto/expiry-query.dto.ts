import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max } from 'class-validator';
import { DAYS_365_IN_SECONDS } from '../../constants';

export class ExpiryQuery {
  @IsInt()
  @Max(DAYS_365_IN_SECONDS)
  @Type(() => Number)
  expiration: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  patch?: boolean;
}
