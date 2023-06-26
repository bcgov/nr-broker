import { IsOptional, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class ServiceDto {
  @IsString()
  @Column()
  environment: string;

  // Defaults to environment
  @IsString()
  @IsOptional()
  @Column()
  instanceName?: string;

  @IsString()
  @Column()
  name: string;

  @IsString()
  @Column()
  project: string;

  // TODO: Remove
  @IsString()
  @IsOptional()
  @Column()
  version?: string;
}
