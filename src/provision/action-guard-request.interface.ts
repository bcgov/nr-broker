import { Request } from 'express';
import { DatabaseAccessActionDto } from '../intention/dto/database-access-action.dto';
import { PackageInstallationActionDto } from '../intention/dto/package-installation-action.dto';
import { PackageProvisionActionDto } from '../intention/dto/package-provision-action.dto';
import { ServerAccessActionDto } from '../intention/dto/server-access-action.dto';

export interface ActionGuardRequest extends Request {
  brokerActionDto?:
    | DatabaseAccessActionDto
    | ServerAccessActionDto
    | PackageInstallationActionDto
    | PackageProvisionActionDto;
}
