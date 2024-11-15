import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  Index,
  Embedded,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ActionDto } from './action.dto';
import { BrokerJwtDto } from '../../auth/broker-jwt.dto';
import { EventDto } from './event.dto';
import { TransactionDto } from './transaction.dto';
import { UserDto } from './user.dto';
import { BackupActionDto } from './backup.action.dto';
import { DatabaseAccessActionDto } from './database-access-action.dto';
import { PackageBuildActionDto } from './package-build-action.dto';
import { PackageConfigureActionDto } from './package-configure-action.dto';
import { PackageInstallationActionDto } from './package-installation-action.dto';
import { PackageProvisionActionDto } from './package-provision-action.dto';
import { ProcessEndActionDto } from './process-end-action.dto';
import { ProcessStartActionDto } from './process-start-action.dto';
import { ServerAccessActionDto } from './server-access-action.dto';
import { UrlDto } from './url.dto';

@Entity({ tableName: 'intention' })
// @Index(['actions.transaction.hash'])
export class IntentionEntity {
  static projectAction(
    intention: IntentionEntity,
    token: string,
  ): ActionDto | null {
    if (intention) {
      // project the matching ActionDto
      return intention.actions.find((action) => action.trace.token === token);
    }
    return null;
  }

  @ApiHideProperty()
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.accountId ? new ObjectId(value.obj.accountId.toString()) : null,
  )
  accountId?: ObjectId;

  @ValidateNested()
  @IsDefined()
  @IsArray()
  @Property()
  @Type(() => ActionDto, {
    discriminator: {
      property: 'action',
      subTypes: [
        { value: BackupActionDto, name: 'backup' },
        { value: DatabaseAccessActionDto, name: 'database-access' },
        { value: ServerAccessActionDto, name: 'server-access' },
        { value: PackageBuildActionDto, name: 'package-build' },
        { value: PackageConfigureActionDto, name: 'package-configure' },
        { value: PackageInstallationActionDto, name: 'package-installation' },
        { value: PackageProvisionActionDto, name: 'package-provision' },
        { value: ProcessEndActionDto, name: 'process-end' },
        { value: ProcessStartActionDto, name: 'process-start' },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  actions: ActionDto[];

  // Not a column - decoration
  @IsOptional()
  auditUrl?: string;

  @ValidateNested()
  @IsDefined()
  @Property()
  @Type(() => EventDto)
  event: EventDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Property()
  @Type(() => BrokerJwtDto)
  jwt?: BrokerJwtDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Property()
  @Type(() => TransactionDto)
  transaction?: TransactionDto;

  @Embedded({ entity: () => UrlDto, nullable: true })
  url?: UrlDto;

  @Embedded({ entity: () => UserDto })
  user: UserDto;

  @ApiHideProperty()
  @Property({ nullable: true })
  @Index()
  expiry?: number;

  @ApiHideProperty()
  @Property({ nullable: true })
  @Index()
  closed?: boolean;

  @Property({ nullable: true })
  requireRoleId?: boolean;
}
