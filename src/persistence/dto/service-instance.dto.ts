import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectIdColumn } from 'typeorm';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { VertexPointerDto } from './vertex-pointer.dto';
import { Type } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { IntentionActionPointerDto } from './intention-action-pointer.dto';

@Entity({ name: 'serviceInstance' })
export class ServiceInstanceDto extends VertexPointerDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsOptional()
  @Column(() => IntentionActionPointerDto)
  @Type(() => IntentionActionPointerDto)
  action?: IntentionActionPointerDto;

  @IsOptional()
  @Column(() => IntentionActionPointerDto, { array: true })
  @Type(() => IntentionActionPointerDto)
  actionHistory?: IntentionActionPointerDto[];
}
