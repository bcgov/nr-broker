import { PackageDto } from '../../intention/dto/package.dto';
import { SemverVersion } from '../../util/action.util';
import { EnvironmentEntity } from '../dto/environment.entity';
import { IntentionActionPointerDto } from '../dto/intention-action-pointer.dto';
import { PackageBuildSearchResult } from '../dto/package-build-rest.dto';
import { PackageBuildEntity } from '../dto/package-build.entity';
import { UserEntity } from '../dto/user.entity';

export abstract class BuildRepository {
  public abstract addBuild(
    intentionId: string,
    action: string,
    serviceId: string,
    name: string,
    semvar: SemverVersion,
    buildPackage: PackageDto,
  ): Promise<PackageBuildEntity>;

  public abstract getBuild(id: string): Promise<PackageBuildEntity>;

  public abstract getBuildByPackageDetail(
    serviceId: string,
    name: string,
    semvar: SemverVersion,
  ): Promise<PackageBuildEntity>;

  public abstract addInstallActionToBuild(
    buildId: string,
    pointer: IntentionActionPointerDto,
  ): Promise<PackageBuildEntity>;

  public abstract searchBuild(
    serviceId: string,
    offset: number,
    limit: number,
  ): Promise<PackageBuildSearchResult>;

  public abstract approvePackage(
    packageBuild: PackageBuildEntity,
    user: UserEntity,
    environment: EnvironmentEntity,
  ): Promise<PackageBuildEntity>;
}
