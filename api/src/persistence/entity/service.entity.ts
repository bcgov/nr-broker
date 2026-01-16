import { ApiHideProperty } from '@nestjs/swagger';
import {
  Embedded,
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { VertexPointerEntity } from './vertex-pointer.entity';
import { VaultConfigDto } from './vault-config.embeddable';
import { COLLECTION_COLLATION_LOCALE } from '../../constants';

@Entity({ tableName: 'service' })
export class ServiceEntity extends VertexPointerEntity {
  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property({ nullable: true })
  description?: string;

  @Property()
  @Index({ options: { collation: { locale: COLLECTION_COLLATION_LOCALE } } })
  name: string;

  @Property({ nullable: true })
  title?: string;

  @Property({ nullable: true })
  lifecycle?: string;

  @Property({ nullable: true })
  type?: string;

  @Embedded({ entity: () => VaultConfigDto, nullable: true, object: true })
  vaultConfig?: VaultConfigDto;
}
