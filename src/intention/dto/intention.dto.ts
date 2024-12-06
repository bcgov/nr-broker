import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ObjectId } from 'mongodb';
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
import { UrlDto } from './url.dto';

export class IntentionDto {
  id: string;

  @ApiProperty({ type: () => String })
  @Transform((value) =>
    value.obj.accountId ? new ObjectId(value.obj.accountId.toString()) : null,
  )
  accountId?: ObjectId;

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
  actions: ActionDto[];

  // Not a column - decoration
  // @IsOptional()
  // auditUrl?: string;

  @ValidateNested()
  @IsDefined()
  @Type(() => EventDto)
  event: EventDto;

  // @ValidateNested()
  // @IsOptional()
  // @ApiHideProperty()
  // @Type(() => BrokerJwtDto)
  // jwt?: BrokerJwtDto;

  // @ValidateNested()
  // @IsOptional()
  // @ApiHideProperty()
  // @Type(() => TransactionDto)
  // transaction?: TransactionDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => UrlDto)
  url?: UrlDto;

  @ValidateNested()
  @IsDefined()
  @Type(() => UserDto)
  user: UserDto;

  // @IsOptional()
  // @IsNumber()
  // @ApiHideProperty()
  // expiry?: number;

  // @IsOptional()
  // @IsBoolean()
  // @ApiHideProperty()
  // closed?: boolean;

  // @ApiProperty()
  // requireRoleId?: boolean;
}
