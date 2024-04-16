import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Column, Entity, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Transform } from 'class-transformer';

export class JwtRegistryClaimsDto {
  @Column()
  @IsString()
  client_id: string;

  @Column()
  @IsNumber()
  exp: number;

  @Column()
  @IsString()
  jti: string;

  @Column()
  @IsString()
  sub: string;
}

@Entity({ name: 'jwtRegistry' })
export class JwtRegistryDto {
  @ObjectIdColumn()
  @ApiHideProperty()
  id: ObjectId;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) => new ObjectId(value.obj.intention.toString()))
  @Index()
  accountId: ObjectId;

  @Column()
  @IsBoolean()
  @IsOptional()
  blocked?: boolean;

  @Column(() => JwtRegistryClaimsDto)
  claims: JwtRegistryClaimsDto;

  @Column()
  @ApiProperty({ type: () => String })
  @Transform((value) => new ObjectId(value.obj.intention.toString()))
  @Index()
  createdUserId: ObjectId;

  @Column()
  @IsDate()
  createdAt: Date;
}
