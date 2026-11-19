import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CatalogComponent } from '../catalog/catalog-component';
import { CatalogEntity } from '../catalog/catalog-entity';
import type { CatalogEntityType } from '../catalog/catalog-entity';
import { CatalogLocationEntity } from '../catalog/catalog-location';
import { CatalogSystem } from '../catalog/catalog-system';
import type { CatalogSnapshot } from '../catalog/catalog-repository';
import { GITHUB_CATALOG_ROOT_FILE } from '../constants';
import { CatalogUtil } from '../util/catalog.util';
import { GithubService } from './github.service';
import type { CatalogRepoScanJob } from './github-catalog.types';

@Injectable()
export class GithubCatalogFileReader {
  private readonly logger = new Logger(GithubCatalogFileReader.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly catalogUtil: CatalogUtil,
    private readonly githubService: GithubService,
  ) {}

  /**
   * Read the root file and follow its Location targets one level.
   */
  public async collectEntities(
    job: CatalogRepoScanJob,
    token: string,
  ): Promise<CatalogSnapshot | null> {
    let complete = true;
    const onError = () => {
      complete = false;
    };
    const rootEntities = await this.readCatalogFile<
      CatalogComponent | CatalogSystem | CatalogLocationEntity
    >(
      job,
      GITHUB_CATALOG_ROOT_FILE,
      token,
      [CatalogComponent, CatalogSystem, CatalogLocationEntity],
      onError,
    );
    if (rootEntities === null) {
      return null;
    }

    const entities: (CatalogComponent | CatalogSystem)[] = [];
    const locationPaths = new Set<string>();
    for (const entity of rootEntities) {
      if (entity instanceof CatalogComponent || entity instanceof CatalogSystem) {
        entities.push(entity);
      } else if (entity instanceof CatalogLocationEntity) {
        entity.targets.forEach((target) => locationPaths.add(target));
      }
    }
    locationPaths.delete(GITHUB_CATALOG_ROOT_FILE);

    for (const path of locationPaths) {
      const targetEntities = await this.readCatalogFile<CatalogComponent | CatalogSystem>(job, path, token, [
        CatalogComponent,
        CatalogSystem,
      ], onError);
      if (targetEntities === null) {
        complete = false;
        this.logWarning(
          `Catalog location target not found: ${job.org}/${job.repo}:${path}`,
          job,
          path,
        );
        continue;
      }
      entities.push(...targetEntities);
    }
    return { entities, complete };
  }

  private async readCatalogFile<T extends CatalogEntity>(
    job: CatalogRepoScanJob,
    path: string,
    token: string,
    types: CatalogEntityType<T>[],
    onError: () => void,
  ): Promise<T[] | null> {
    const content = await this.githubService.getRepoFileContent(
      job.org,
      job.repo,
      path,
      job.defaultBranch,
      token,
    );
    if (content === null) {
      return null;
    }
    return CatalogEntity.parseCatalogEntities(
      path,
      content,
      types,
      this.catalogUtil,
      (error) => {
        onError();
        this.logWarning(error.message, job, path);
      },
    );
  }

  private logWarning(
    message: string,
    job: CatalogRepoScanJob,
    catalogPath: string,
  ): void {
    this.logger.warn(message);
    this.auditService.recordGitHubCatalogSync('info', 'unknown', message, {
      organization: job.org,
      repository: job.repo,
      repositoryId: job.repositoryId,
      repositoryUrl: job.htmlUrl,
      catalogPath,
    });
  }
}
