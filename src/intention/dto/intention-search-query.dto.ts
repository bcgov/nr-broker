import { Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';

export class IntentionSearchQuery {
  @IsString()
  where: string;

  @IsInt()
  @Type(() => Number)
  offset: number;

  @IsInt()
  @Type(() => Number)
  limit: number;
}
