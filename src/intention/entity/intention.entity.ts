import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
  Embedded,
  BaseEntity,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

import { ActionEmbeddable } from './action.embeddable';
import { BrokerJwtEmbeddable } from '../../auth/broker-jwt.embeddable';
import { EventEmbeddable } from './event.embeddable';
import { TransactionEmbeddable } from './transaction.embeddable';
import { UserEmbeddable } from './user.embeddable';
import { BackupActionEmbeddable } from './backup.action.embeddable';
import { DatabaseAccessActionEmbeddable } from './database-access-action.embeddable';
import { PackageBuildActionEmbeddable } from './package-build-action.embeddable';
import { PackageConfigureActionEmbeddable } from './package-configure-action.embeddable';
import { PackageInstallationActionEmbeddable } from './package-installation-action.embeddable';
import { PackageProvisionActionEmbeddable } from './package-provision-action.embeddable';
import { ProcessEndActionEmbeddable } from './process-end-action.embeddable';
import { ProcessStartActionEmbeddable } from './process-start-action.embeddable';
import { ServerAccessActionEmbeddable } from './server-access-action.embeddable';
import { BrokerAccountEntity } from '../../persistence/entity/broker-account.entity';

@Entity({ tableName: 'intention' })
export class IntentionEntity extends BaseEntity {
  constructor(
    actions: (
      | BackupActionEmbeddable
      | DatabaseAccessActionEmbeddable
      | ServerAccessActionEmbeddable
      | PackageBuildActionEmbeddable
      | PackageConfigureActionEmbeddable
      | PackageInstallationActionEmbeddable
      | PackageProvisionActionEmbeddable
      | ProcessEndActionEmbeddable
      | ProcessStartActionEmbeddable
    )[],
    event: EventEmbeddable,
    jwt: BrokerJwtEmbeddable,
    user: UserEmbeddable,
    transaction: TransactionEmbeddable,
    expiry: number,
    account: BrokerAccountEntity,
  ) {
    super();
    this.actions = actions;
    this.event = event;
    this.jwt = jwt;
    this.user = user;

    this.transaction = transaction;
    this.expiry = expiry;

    this.accountId = account._id;
    this.requireRoleId = account.requireRoleId;
  }

  static projectAction(
    intention: IntentionEntity,
    token: string,
  ): ActionEmbeddable | null {
    if (intention) {
      // project the matching ActionEmbeddable
      return intention.actions.find((action) => action.trace.token === token);
    }
    return null;
  }

  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property({ nullable: true })
  accountId?: ObjectId;

  @Embedded({
    entity: () => [
      BackupActionEmbeddable,
      DatabaseAccessActionEmbeddable,
      ServerAccessActionEmbeddable,
      PackageBuildActionEmbeddable,
      PackageConfigureActionEmbeddable,
      PackageInstallationActionEmbeddable,
      PackageProvisionActionEmbeddable,
      ProcessEndActionEmbeddable,
      ProcessStartActionEmbeddable,
    ],
    array: true,
  })
  actions: ActionEmbeddable[];

  // Not a column - decoration
  @Property({ persist: false, nullable: true })
  auditUrl?: string;

  @Embedded({ entity: () => EventEmbeddable, object: true })
  event: EventEmbeddable;

  @Embedded({ entity: () => BrokerJwtEmbeddable, nullable: true, object: true })
  jwt?: BrokerJwtEmbeddable;

  @Embedded({ entity: () => TransactionEmbeddable, object: true })
  transaction: TransactionEmbeddable;

  @Embedded({ entity: () => UserEmbeddable, object: true })
  user: UserEmbeddable;

  @Property({ nullable: true })
  @Index()
  expiry: number;

  @Property({ nullable: true })
  @Index()
  closed?: boolean;

  @Property({ nullable: true })
  requireRoleId?: boolean;
}
