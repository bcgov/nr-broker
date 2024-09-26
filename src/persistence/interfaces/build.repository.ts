import { PackageDto } from '../../intention/dto/package.dto';
import { SemverVersion } from '../../util/action.util';
import { EnvironmentDto } from '../dto/environment.dto';
import { IntentionActionPointerDto } from '../dto/intention-action-pointer.dto';
import { PackageBuildSearchResult } from '../dto/package-build-rest.dto';
import { PackageBuildDto } from '../dto/package-build.dto';
import { UserDto } from '../dto/user.dto';

export abstract class BuildRepository {
  public abstract addBuild(
    intentionId: string,
    action: string,
    serviceId: string,
    name: string,
    semvar: SemverVersion,
    buildPackage: PackageDto,
  ): Promise<PackageBuildDto>;

  public abstract getBuild(id: string): Promise<PackageBuildDto>;

  public abstract getBuildByPackageDetail(
    serviceId: string,
    name: string,
    semvar: SemverVersion,
  ): Promise<PackageBuildDto>;

  public abstract addInstallActionToBuild(
    buildId: string,
    pointer: IntentionActionPointerDto,
  ): Promise<PackageBuildDto>;

  public abstract searchBuild(
    serviceId: string,
    offset: number,
    limit: number,
  ): Promise<PackageBuildSearchResult>;

  public abstract approvePackage(
    packageBuild: PackageBuildDto,
    user: UserDto,
    environment: EnvironmentDto,
  ): Promise<PackageBuildDto>;
}
