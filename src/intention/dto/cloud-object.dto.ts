import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EdgePropDto } from '../../persistence/dto/edge-prop.dto';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
class CloudObjectAccountDto {
  @IsString()
  @IsOptional()
  @Property()
  id: string;

  @IsString()
  @IsOptional()
  @Property()
  name: string;
}

@Entity()
class CloudObjectInstanceDto {
  @IsString()
  @IsOptional()
  @Property()
  id: string;

  @IsString()
  @IsOptional()
  @Property()
  name: string;
}

@Entity()
class CloudObjectMachineDto {
  @IsString()
  @Property()
  type: string;
}

@Entity()
class CloudObjectProjectDto {
  @IsString()
  @IsOptional()
  @Property()
  id: string;

  @IsString()
  @IsOptional()
  @Property()
  name: string;
}

@Entity()
class CloudObjectServiceDto {
  @IsString()
  @Property()
  name: string;
}

@Entity()
export class CloudObjectDto {
  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => CloudObjectAccountDto)
  account?: CloudObjectAccountDto;

  @IsString()
  @IsOptional()
  @Property()
  availability_zone?: string;

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => CloudObjectInstanceDto)
  instance?: CloudObjectInstanceDto;

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => CloudObjectMachineDto)
  machine?: CloudObjectMachineDto;

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => CloudObjectProjectDto)
  project?: CloudObjectProjectDto;

  @IsOptional()
  @Property()
  @Type(() => EdgePropDto)
  prop?: EdgePropDto;

  @IsString()
  @IsIn(['merge', 'replace'])
  @IsOptional()
  @Property()
  propStrategy?: 'merge' | 'replace';

  @IsString()
  @IsOptional()
  @Property()
  provider?: string;

  @IsString()
  @IsOptional()
  @Property()
  region?: string;

  @ValidateNested()
  @IsOptional()
  @Property()
  @Type(() => CloudObjectServiceDto)
  service?: CloudObjectServiceDto;
}
