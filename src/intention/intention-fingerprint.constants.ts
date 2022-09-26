import { IntentionAuthenticationDto } from './dto/intention-authentication.dto';
import { IntentionDatabaseAccessDto } from './dto/intention-database-access.dto';
import { IntentionPackageInstallationDto } from './dto/intention-package-installation.dto';
import { IntentionDto } from './dto/intention.dto';

export interface IntentionFingerprint {
  name: string;
  dtoClass: typeof IntentionDto;
  roles: string[];
}

export const FINGERPRINTS: IntentionFingerprint[] = [
  {
    name: 'Authentication',
    dtoClass: IntentionAuthenticationDto,
    roles: ['provision', 'provision/token/self'],
  },
  {
    name: 'DatabaseAccess',
    dtoClass: IntentionDatabaseAccessDto,
    roles: ['provision', 'provision/token/self'],
  },
  {
    name: 'PackageInstallation',
    dtoClass: IntentionPackageInstallationDto,
    roles: ['provision', 'provision/approle/secret-id'],
  },
];
