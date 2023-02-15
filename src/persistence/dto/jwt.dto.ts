import { ApiHideProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Column, ObjectIdColumn, ObjectID } from 'typeorm';

export abstract class JwtDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectID;

  @Column()
  @IsString()
  @IsOptional()
  client_id?: string;

  @Column()
  @IsString()
  @IsOptional()
  jti?: string;

  @Column()
  @IsString()
  @IsOptional()
  sub?: string;
}
