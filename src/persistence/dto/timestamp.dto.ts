import { IsOptional } from 'class-validator';
import { Column, Index } from 'typeorm';

export class TimestampDto {
  @Index()
  @Column()
  createdAt: Date;

  @IsOptional()
  @Index()
  @Column()
  updatedAt?: Date;

  static create() {
    const ts = new TimestampDto();
    ts.createdAt = new Date();
    return ts;
  }
}
