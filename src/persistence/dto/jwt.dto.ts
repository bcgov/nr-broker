import { ApiHideProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Column, ObjectIdColumn, ObjectId } from 'typeorm';

export abstract class JwtDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  @IsString()
  @IsOptional()
  client_id?: string;

  @Column()
  @IsString()
  @IsOptional()
  expiry?: string;

  @Column()
  @IsString()
  @IsOptional()
  jti?: string;

  @Column()
  @IsString()
  @IsOptional()
  sub?: string;
}
