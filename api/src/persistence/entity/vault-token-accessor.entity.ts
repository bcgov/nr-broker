import { BaseEntity } from '@mikro-orm/core';
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/decorators/legacy';
import { ObjectId } from 'mongodb';

/**
 * Stores the Vault login token accessors issued for an intention's actions
 * (via token/self provisioning). Kept in its own collection, separate from the
 * intention document, so the accessor is never serialized back to clients via
 * the intention DTO / search paths. Revoked (and removed) when the intention
 * closes.
 */
@Entity({ tableName: 'vaultTokenAccessor' })
export class VaultTokenAccessorEntity extends BaseEntity {
  constructor(
    intentionId: string,
    actionToken: string,
    accessor: string,
  ) {
    super();
    this.intentionId = intentionId;
    this.actionToken = actionToken;
    this.accessor = accessor;
  }

  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index()
  intentionId: string;

  @Property()
  @Index()
  actionToken: string;

  @Property()
  accessor: string;
}
