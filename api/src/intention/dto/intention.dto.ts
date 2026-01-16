import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ActionDto } from './action.dto';
import { EventDto } from './event.dto';
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
import { TransactionDto } from './transaction.dto';
import { BrokerJwtDto } from '../../auth/broker-jwt.dto';

export class IntentionDto {
  id?: string;
  accountId?: string;

  @ValidateNested()
  @IsDefined()
  @IsArray()
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
  actions!: ActionDto[];

  // Not a column - decoration
  // Out
  @IsOptional()
  @IsString()
  auditUrl?: string;

  @ValidateNested()
  @IsDefined()
  @Type(() => EventDto)
  event!: EventDto;

  // Out
  @ValidateNested()
  @IsOptional()
  @Type(() => BrokerJwtDto)
  jwt?: BrokerJwtDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => TransactionDto)
  transaction?: TransactionDto;

  @ValidateNested()
  @IsDefined()
  @Type(() => UserDto)
  user!: UserDto;

  // Out
  @IsOptional()
  @IsNumber()
  expiry?: number;

  // Out
  @IsOptional()
  @IsBoolean()
  closed?: boolean;

  // Out
  @IsOptional()
  @IsBoolean()
  requireRoleId?: boolean;
}
