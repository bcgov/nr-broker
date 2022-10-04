import { IsNumber, IsString } from 'class-validator';

export class TransactionDto {
  @IsString()
  token: string;

  @IsString()
  hash: string;

  @IsString()
  start?: string;

  @IsString()
  end?: string;

  @IsNumber()
  duration?: number;

  @IsString()
  outcome?: string;
}
