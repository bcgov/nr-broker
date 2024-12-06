import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Embeddable,
  Embedded,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

@Embeddable()
export class JwtRegistryClaimsDto {
  @Property()
  client_id: string;

  @Property()
  exp: number;

  @Property()
  jti: string;

  @Property()
  sub: string;
}

@Entity({ tableName: 'jwtRegistry' })
export class JwtRegistryEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  accountId: ObjectId;

  @Property({ nullable: true })
  blocked?: boolean;

  @Embedded({ entity: () => JwtRegistryClaimsDto, object: true })
  claims: JwtRegistryClaimsDto;

  @Property()
  @ApiProperty({ type: () => String })
  @Index()
  createdUserId: ObjectId;

  @Property()
  createdAt: Date;
}
