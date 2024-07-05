import { PackageRestDto } from './package-rest.dto';
import { IntentionActionPointerRestDto } from './intention-action-pointer-rest.dto';
import { TimestampRestDto } from './timestamp-rest.dto';

class PackageBuildApprovalRestDto {
  environment!: string;
  user!: string;
  at!: string;
}

export class PackageBuildRestDto {
  id!: string;
  approval!: PackageBuildApprovalRestDto[];
  installed!: IntentionActionPointerRestDto[];
  service!: string;
  semvar!: string;
  package!: PackageRestDto;
  timestamps!: TimestampRestDto;
}
