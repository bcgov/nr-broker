import { IsDefined, IsOptional, IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
export class ServiceTargetDto {
  @IsString()
  @IsDefined()
  @Column()
  environment: string;

  // Defaults to environment
  @IsString()
  @IsOptional()
  @Column()
  instanceName?: string;

  @IsString()
  @IsDefined()
  @Column()
  name: string;

  @IsString()
  @IsDefined()
  @Column()
  project: string;
}
