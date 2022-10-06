import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TransactionDto {
  @IsString()
  token: string;

  @IsString()
  hash: string;

  @IsString()
  @IsOptional()
  start?: string;

  @IsString()
  @IsOptional()
  end?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  outcome?: string;
}
