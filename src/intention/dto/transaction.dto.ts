import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class TransactionDto {
  @IsString()
  @Column()
  token: string;

  @IsString()
  @Column()
  hash: string;

  @IsString()
  @IsOptional()
  @Column()
  start?: string;

  @IsString()
  @IsOptional()
  @Column()
  end?: string;

  @IsNumber()
  @IsOptional()
  @Column()
  duration?: number;

  @IsString()
  @IsOptional()
  @Column()
  outcome?: string;
}
