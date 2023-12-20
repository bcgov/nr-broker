import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
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

@Entity({ name: 'intention' })
// @Index(['actions.transaction.hash'])
export class IntentionDto {
  static projectAction(
    intention: IntentionDto,
    token: string,
  ): ActionDto | null {
    if (intention) {
      // project the matching ActionDto
      return intention.actions.find((action) => action.trace.token === token);
    }
    return null;
  }

  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  @ApiProperty({ type: () => String })
  accountId?: ObjectId;

  @ValidateNested()
  @IsDefined()
  @IsArray()
  @Column(() => ActionDto)
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
  @Column(() => EventDto)
  @Type(() => EventDto)
  event: EventDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => BrokerJwtDto)
  @Type(() => BrokerJwtDto)
  jwt?: BrokerJwtDto;

  @ValidateNested()
  @IsOptional()
  @ApiHideProperty()
  @Column(() => TransactionDto)
  @Type(() => TransactionDto)
  transaction?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @Column(() => UrlDto)
  @Type(() => UrlDto)
  url?: UrlDto;

  @ValidateNested()
  @IsDefined()
  @Column(() => UserDto)
  @Type(() => UserDto)
  user: UserDto;

  @IsOptional()
  @IsNumber()
  @ApiHideProperty()
  @Column()
  @Index()
  expiry?: number;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  @Column()
  @Index()
  closed?: boolean;

  @Column()
  @ApiProperty()
  requireRoleId?: boolean;
}
