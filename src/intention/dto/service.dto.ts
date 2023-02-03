import { IsOptional, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class ServiceDto {
  @IsString()
  @Column()
  environment: string;

  @IsString()
  @Column()
  name: string;

  @IsString()
  @Column()
  project: string;

  @IsString()
  @IsOptional()
  @Column()
  version?: string;
}
