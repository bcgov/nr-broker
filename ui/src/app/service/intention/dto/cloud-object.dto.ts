import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EdgePropDto } from '../../persistence/dto/edge-prop.dto';

class CloudObjectAccountDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

class CloudObjectInstanceDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

class CloudObjectMachineDto {
  @IsString()
  type!: string;
}

class CloudObjectProjectDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

class CloudObjectServiceDto {
  @IsString()
  name!: string;
}

export class CloudObjectDto {
  @ValidateNested()
  @IsOptional()
  @Type(() => CloudObjectAccountDto)
  account?: CloudObjectAccountDto;

  @IsString()
  @IsOptional()
  availability_zone?: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => CloudObjectInstanceDto)
  instance?: CloudObjectInstanceDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => CloudObjectMachineDto)
  machine?: CloudObjectMachineDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => CloudObjectProjectDto)
  project?: CloudObjectProjectDto;

  @IsOptional()
  @Type(() => EdgePropDto)
  prop?: EdgePropDto;

  @IsString()
  @IsIn(['merge', 'replace'])
  @IsOptional()
  propStrategy?: 'merge' | 'replace';

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => CloudObjectServiceDto)
  service?: CloudObjectServiceDto;
}
