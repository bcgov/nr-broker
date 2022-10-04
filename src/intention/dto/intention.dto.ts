import { InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ActionDto } from './action.dto';
import { DatabaseAccessActionDto } from './database-access-action.dto';
import { PackageInstallationActionDto } from './package-installation-action.dto';
import { PackageProvisionActionDto } from './package-provision-action.dto';
import { ServerAccessActionDto } from './server-access-action.dto';
import { TransactionDto } from './transaction.dto';

export class EventDto {
  @IsString()
  reason: string;

  @IsString()
  url: string;
}

export class UserDto {
  @IsString()
  id: string;
}

export class IntentionDto {
  static plainToInstance(value: any): IntentionDto {
    const object = plainToInstance(IntentionDto, value);

    if (object.actions && Array.isArray(object.actions)) {
      object.actions = object.actions.map(IntentionDto.actionFactory);
    }

    if (object.event) {
      object.event = plainToInstance(EventDto, object.event);
    }

    if (object.transaction) {
      object.transaction = plainToInstance(TransactionDto, object.transaction);
    }

    if (object.user) {
      object.user = plainToInstance(UserDto, object.user);
    }
    return object;
  }

  static actionFactory(object: any) {
    if (!object || typeof object !== 'object') {
      throw new InternalServerErrorException();
    }
    if (object.action === 'database-access') {
      return plainToInstance(
        DatabaseAccessActionDto,
        ActionDto.plainToInstance(object),
      );
    } else if (object.action === 'server-access') {
      return plainToInstance(
        ServerAccessActionDto,
        ActionDto.plainToInstance(object),
      );
    } else if (object.action === 'package-installation') {
      return plainToInstance(
        PackageInstallationActionDto,
        ActionDto.plainToInstance(object),
      );
    } else if (object.action === 'package-provision') {
      return plainToInstance(
        PackageProvisionActionDto,
        ActionDto.plainToInstance(object),
      );
    }
    throw new InternalServerErrorException();
  }

  @ValidateNested()
  @IsDefined()
  @IsArray()
  actions: ActionDto[];

  @ValidateNested()
  @IsDefined()
  event: EventDto;

  @ValidateNested()
  @IsOptional()
  transaction?: TransactionDto;

  @ValidateNested()
  @IsDefined()
  user: UserDto;
}
