import { ApiHideProperty } from '@nestjs/swagger';
import { IsDefined, IsNumber, IsString } from 'class-validator';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

@Entity({ name: 'connectionConfig' })
export class ConnectionConfigDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @IsDefined()
  @IsString()
  @Column()
  collection: string;

  @IsDefined()
  @IsString()
  @Column()
  description: string;

  @IsDefined()
  @IsString()
  @Column()
  href: string;

  @IsDefined()
  @IsString()
  @Column()
  name: string;

  @IsDefined()
  @IsNumber()
  @Column()
  order: number;
}
