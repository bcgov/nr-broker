import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Entity, Column } from 'typeorm';

@Entity()
class CloudObjectAccountDto {
  @IsString()
  @Column()
  id: string;

  @IsString()
  @Column()
  name: string;
}

@Entity()
class CloudObjectInstanceDto {
  @IsString()
  @Column()
  id: string;

  @IsString()
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
  @Column()
  id: string;

  @IsString()
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
  static plainToInstance(object: any): CloudObjectDto {
    if (object.account) {
      object.account = plainToInstance(CloudObjectAccountDto, object.account);
    }
    if (object.instance) {
      object.instance = plainToInstance(
        CloudObjectInstanceDto,
        object.instance,
      );
    }
    if (object.machine) {
      object.machine = plainToInstance(CloudObjectMachineDto, object.machine);
    }
    if (object.project) {
      object.project = plainToInstance(CloudObjectProjectDto, object.project);
    }
    if (object.service) {
      object.service = plainToInstance(CloudObjectServiceDto, object.service);
    }
    return plainToInstance(CloudObjectDto, object);
  }
  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectAccountDto)
  account?: CloudObjectAccountDto;

  @IsString()
  @IsOptional()
  @Column()
  availability_zone?: string;

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectInstanceDto)
  instance?: CloudObjectInstanceDto;

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectMachineDto)
  machine?: CloudObjectMachineDto;

  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectProjectDto)
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
  service?: CloudObjectServiceDto;
}
