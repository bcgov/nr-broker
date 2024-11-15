import { Entity, Property } from '@mikro-orm/core';
import { IsDefined, IsOptional, IsString } from 'class-validator';

@Entity()
export class ServiceTargetDto {
  @IsString()
  @IsDefined()
  @Property()
  environment: string;

  // Defaults to environment
  @IsString()
  @IsOptional()
  @Property()
  instanceName?: string;

  @IsString()
  @IsDefined()
  @Property()
  name: string;

  @IsString()
  @IsDefined()
  @Property()
  project: string;
}
