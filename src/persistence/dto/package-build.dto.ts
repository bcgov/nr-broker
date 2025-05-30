import { PackageDto } from '../../intention/dto/package.dto';
import { IntentionActionPointerDto } from './intention-action-pointer.dto';
import { TimestampDto } from './timestamp.dto';

export class PackageBuildSearchResult {
  data!: PackageBuildDto[];
  meta!: {
    total: number;
  };
}

class PackageBuildApprovalDto {
  environment!: string;
  user!: string;
  at!: string;
}

export class PackageBuildDto {
  id!: string;
  approval!: PackageBuildApprovalDto[];
  installed!: IntentionActionPointerDto[];
  source!: IntentionActionPointerDto;
  package!: PackageDto;
  replaced!: boolean;
  service!: string;
  semver!: string;
  timestamps?: TimestampDto;
}
