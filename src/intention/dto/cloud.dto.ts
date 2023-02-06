import { plainToInstance } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { Entity, Column } from 'typeorm';

import { CloudObjectDto } from './cloud-object.dto';

@Entity()
export class CloudDto {
  static plainToInstance(object: any): CloudDto {
    if (object.source) {
      object.source = CloudObjectDto.plainToInstance(object.source);
    }
    if (object.target) {
      object.target = CloudObjectDto.plainToInstance(object.target);
    }
    return plainToInstance(CloudDto, object);
  }
  @ValidateNested()
  @IsOptional()
  @Column(() => CloudObjectDto)
  source: CloudObjectDto;

  @IsDefined()
  @ValidateNested()
  @Column(() => CloudObjectDto)
  target: CloudObjectDto;
}
