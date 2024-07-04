import { CollectionSearchResult } from '../../collection/dto/collection-search-result.dto';
import { PackageDto } from '../../intention/dto/package.dto';
import { SemverVersion } from '../../util/action.util';
import { EnvironmentDto } from '../dto/environment.dto';
import { IntentionActionPointerDto } from '../dto/intention-action-pointer.dto';
import { PackageBuildDto } from '../dto/package-build.dto';
import { UserDto } from '../dto/user.dto';

export abstract class BuildRepository {
  public abstract addBuild(
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
  ): Promise<CollectionSearchResult<PackageBuildDto>>;

  public abstract approvePackage(
    packageBuild: PackageBuildDto,
    user: UserDto,
    environment: EnvironmentDto,
  ): Promise<PackageBuildDto>;
}
