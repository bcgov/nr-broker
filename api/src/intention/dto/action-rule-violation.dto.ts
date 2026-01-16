import { IsString } from 'class-validator';

export class ActionRuleViolationDto {
  @IsString()
  message!: string;

  @IsString()
  key!: string;
}
