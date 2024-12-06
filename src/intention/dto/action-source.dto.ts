import { IsDefined, IsOptional, IsString } from 'class-validator';

export class ActionSourceDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsDefined()
  intention: string;
}
