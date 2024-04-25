import { Column, Index } from 'typeorm';

export class TimestampDto {
  @Index()
  @Column()
  createdAt: Date;

  @Index()
  @Column()
  updatedAt: Date;
}
