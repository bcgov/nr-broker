import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
class CloudObjectAccountDto {
  @IsString()
  @IsOptional()
  @Column()
  id: string;

  @IsString()
  @IsOptional()
  @Column()
  name: string;
}

@Entity()
class CloudObjectInstanceDto {
  @IsString()
  @IsOptional()
  @Column()
  id: string;

  @IsString()
  @IsOptional()
  @Column()
  name: string;
}

@Entity()
class CloudObjectMachineDto {
  @IsString()
  @Column()
  type: string;
}

@Entity()
class CloudObjectProjectDto {
  @IsString()
  @IsOptional()
  @Column()
  id: string;

  @IsString()
  @IsOptional()
  @Column()
  name: string;
}

@Entity()
class CloudObjectServiceDto {
  @IsString()
  @Column()
  name: string;
}

@Entity()
export class CloudObjectDto {
  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectAccountDto)
  @Type(() => CloudObjectAccountDto)
  account?: CloudObjectAccountDto;

  @IsString()
  @IsOptional()
  @Column()
  availability_zone?: string;

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectInstanceDto)
  @Type(() => CloudObjectInstanceDto)
  instance?: CloudObjectInstanceDto;

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectMachineDto)
  @Type(() => CloudObjectMachineDto)
  machine?: CloudObjectMachineDto;

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectProjectDto)
  @Type(() => CloudObjectProjectDto)
  project?: CloudObjectProjectDto;

  @IsString()
  @IsOptional()
  @Column()
  provider?: string;

  @IsString()
  @IsOptional()
  @Column()
  region?: string;

  @ValidateNested()
  @IsOptional()
  @Column()
  @Type(() => CloudObjectServiceDto)
  service?: CloudObjectServiceDto;
}
