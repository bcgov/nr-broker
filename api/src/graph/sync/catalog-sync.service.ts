import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import {
  EnvironmentEntityMap,
  PersistenceUtilService,
} from '../../persistence/persistence-util.service';
import { CatalogAdoptionService } from './catalog-adoption.service';
import { CatalogGraphSyncService } from './catalog-graph-sync.service';
import { CatalogInstanceSyncService } from './catalog-instance-sync.service';

/**
 * Records catalog components, their repository, project and instances in the
 * graph.
 */
@Injectable()
export class CatalogSyncService {
  private readonly logger = new Logger(CatalogSyncService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly persistenceUtilService: PersistenceUtilService,
    private readonly adoptionService: CatalogAdoptionService,
    private readonly graphSyncService: CatalogGraphSyncService,
    private readonly instanceSyncService: CatalogInstanceSyncService,
  ) {}

  /**
   * Sync the components declared in a repository. A failure to sync one
   * component is logged and does not stop the others.
   */
  public async syncRepository(
    repository: CatalogRepository,
    components: CatalogComponent[],
  ): Promise<void> {
    if (components.length === 0) {
      return;
    }

    this.auditService.recordGitHubCatalogSync(
      'start',
      'unknown',
      `Start catalog sync: ${repository.scmUrl}`,
      {
        repository: repository.name,
        repositoryUrl: repository.scmUrl,
      },
    );

    const envMap = components.some((component) => component.instances?.length)
      ? await this.persistenceUtilService.getEnvMap()
      : {};
    const existingRepository = await this.graphSyncService.getRepository(
      repository.scmUrl,
    );
    const adoptable = await this.adoptionService.canAdopt(
      repository,
      components,
      existingRepository,
    );
    const repositoryVertex = await this.graphSyncService.upsertRepository(
      repository,
      existingRepository,
      adoptable,
    );

    let failures = 0;
    for (const component of components) {
      try {
        await this.syncComponent(
          repository,
          component,
          repositoryVertex,
          envMap,
          adoptable,
        );
      } catch (error) {
        failures++;
        this.logger.warn(
          `Catalog sync failed for ${repository.scmUrl}:${component.path} (${component.name}): ${
            (error as Error).message
          }`,
        );
      }
    }

    this.auditService.recordGitHubCatalogSync(
      'end',
      failures === 0 ? 'success' : 'failure',
      `End catalog sync: ${repository.scmUrl}`,
      {
        repository: repository.name,
        repositoryUrl: repository.scmUrl,
      },
    );
  }

  private async syncComponent(
    repository: CatalogRepository,
    component: CatalogComponent,
    repositoryVertex: VertexEntity,
    envMap: EnvironmentEntityMap,
    adoptable: boolean,
  ): Promise<void> {
    const provenance = ProvenanceInfo.catalog(
      repository.scmUrl,
      component.path,
      { adoptable },
    );
    const serviceVertex = await this.graphSyncService.upsertService(
      component,
      provenance,
    );
    await this.graphSyncService.ensureEdge(
      'source',
      serviceVertex,
      repositoryVertex,
      provenance,
    );
    if (component.system) {
      const projectVertex = await this.graphSyncService.upsertProject(
        component.system,
        provenance,
      );
      await this.graphSyncService.ensureEdge(
        'component',
        projectVertex,
        serviceVertex,
        provenance,
      );
    } else {
      this.logger.warn(
        `Catalog component ${component.name} (${component.path}) has no spec.system; skipping project creation`,
      );
    }
    if (component.instances) {
      await this.instanceSyncService.sync(
        component.instances,
        serviceVertex,
        envMap,
        provenance,
      );
    }

    this.auditService.recordGitHubCatalogSync(
      'info',
      'success',
      `Catalog synced service from ${component.path}`,
      {
        repository: repository.name,
        repositoryUrl: repository.scmUrl,
        catalogPath: component.path,
      },
    );
  }
}
