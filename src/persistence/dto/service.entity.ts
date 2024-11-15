import { ApiHideProperty } from '@nestjs/swagger';
import {
  Embedded,
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerDto } from './vertex-pointer.dto';
import { VaultConfigDto } from './vault-config.dto';

@Entity({ tableName: 'service' })
export class ServiceEntity extends VertexPointerDto {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property({ nullable: true })
  description?: string;

  @Property()
  name: string;

  @Property({ nullable: true })
  title?: string;

  @Property({ nullable: true })
  scmUrl?: string;

  @Embedded({ entity: () => VaultConfigDto, nullable: true })
  vaultConfig?: VaultConfigDto;
}
