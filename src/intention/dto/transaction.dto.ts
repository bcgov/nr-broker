import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class TransactionDto {
  @IsString()
  @Property()
  token: string;

  @IsString()
  @Property()
  hash: string;

  @IsString()
  @IsOptional()
  @Property()
  start?: string;

  @IsString()
  @IsOptional()
  @Property()
  end?: string;

  @IsNumber()
  @IsOptional()
  @Property()
  duration?: number;

  @IsString()
  @IsOptional()
  @Property()
  outcome?: string;
}
