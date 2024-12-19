import { SemverVersion } from '../../util/action.util';
import { EnvironmentEntity } from '../entity/environment.entity';
import { IntentionActionPointerEmbeddable } from '../entity/intention-action-pointer.embeddable';
import { PackageBuildEntity } from '../entity/package-build.entity';
import { UserEntity } from '../entity/user.entity';
import { PackageBuildSearchResult } from '../dto/package-build.dto';
import { PackageEmbeddable } from '../../intention/entity/package.embeddable';

export abstract class BuildRepository {
  public abstract addBuild(
    intentionId: string,
    action: string,
    serviceId: string,
    name: string,
    semvar: SemverVersion,
    buildPackage: PackageEmbeddable,
  ): Promise<PackageBuildEntity>;

  public abstract getBuild(id: string): Promise<PackageBuildEntity>;

  public abstract getBuildByPackageDetail(
    serviceId: string,
    name: string,
    semvar: SemverVersion,
  ): Promise<PackageBuildEntity>;

  public abstract addInstallActionToBuild(
    buildId: string,
    pointer: IntentionActionPointerEmbeddable,
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
