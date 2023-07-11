import { Request } from 'express';
import { PackageConfigureActionDto } from './dto/package-configure-action.dto';
import { DatabaseAccessActionDto } from './dto/database-access-action.dto';
import { PackageInstallationActionDto } from './dto/package-installation-action.dto';
import { PackageProvisionActionDto } from './dto/package-provision-action.dto';
import { ServerAccessActionDto } from './dto/server-access-action.dto';
import { PackageBuildActionDto } from './dto/package-build-action.dto';
import { BackupActionDto } from '../intention/dto/backup.action.dto';
import { IntentionDto } from '../intention/dto/intention.dto';
import { ProcessStartActionDto } from './dto/process-start-action.dto';
import { ProcessEndActionDto } from './dto/process-end-action.dto';

export interface ActionGuardRequest extends Request {
  brokerIntentionDto?: IntentionDto;
  brokerActionDto?:
    | BackupActionDto
    | DatabaseAccessActionDto
    | ServerAccessActionDto
    | PackageBuildActionDto
    | PackageConfigureActionDto
    | PackageInstallationActionDto
    | PackageProvisionActionDto
    | ProcessStartActionDto
    | ProcessEndActionDto;
}
