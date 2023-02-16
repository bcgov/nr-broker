import { Request } from 'express';
import { PackageConfigureActionDto } from '../intention/dto/package-configure-action.dto';
import { DatabaseAccessActionDto } from '../intention/dto/database-access-action.dto';
import { PackageInstallationActionDto } from '../intention/dto/package-installation-action.dto';
import { PackageProvisionActionDto } from '../intention/dto/package-provision-action.dto';
import { ServerAccessActionDto } from '../intention/dto/server-access-action.dto';
import { BackupActionDto } from 'src/intention/dto/backup.action.dto';

export interface ActionGuardRequest extends Request {
  brokerActionDto?:
    | BackupActionDto
    | DatabaseAccessActionDto
    | ServerAccessActionDto
    | PackageConfigureActionDto
    | PackageInstallationActionDto
    | PackageProvisionActionDto;
}
