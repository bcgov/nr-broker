import { Request } from 'express';
import { IntentionEntity } from './entity/intention.entity';
import { BackupActionEmbeddable } from './entity/backup.action.embeddable';
import { DatabaseAccessActionEmbeddable } from './entity/database-access-action.embeddable';
import { PackageBuildActionEmbeddable } from './entity/package-build-action.embeddable';
import { PackageConfigureActionEmbeddable } from './entity/package-configure-action.embeddable';
import { PackageInstallationActionEmbeddable } from './entity/package-installation-action.embeddable';
import { PackageProvisionActionEmbeddable } from './entity/package-provision-action.embeddable';
import { ProcessEndActionEmbeddable } from './entity/process-end-action.embeddable';
import { ProcessStartActionEmbeddable } from './entity/process-start-action.embeddable';
import { ServerAccessActionEmbeddable } from './entity/server-access-action.embeddable';

export interface ActionGuardRequest extends Request {
  brokerIntentionEntity?: IntentionEntity;
  brokerActionDto?:
    | BackupActionEmbeddable
    | DatabaseAccessActionEmbeddable
    | ServerAccessActionEmbeddable
    | PackageBuildActionEmbeddable
    | PackageConfigureActionEmbeddable
    | PackageInstallationActionEmbeddable
    | PackageProvisionActionEmbeddable
    | ProcessStartActionEmbeddable
    | ProcessEndActionEmbeddable;
}
