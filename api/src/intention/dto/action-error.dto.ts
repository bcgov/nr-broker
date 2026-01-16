import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

export class ActionErrorDataDto {
  @IsString()
  action!: string;
  @IsString()
  action_id!: string;
  @IsString()
  key!: string;
  @IsString()
  value!: string;
}

export class ActionErrorDto {
  @IsString()
  message!: string;

  @ValidateNested()
  @Type(() => ActionErrorDataDto)
  data!: ActionErrorDataDto;
}
