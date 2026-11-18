import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { CatalogSystem } from '../../catalog/catalog-system';
import { CatalogUtil } from '../../util/catalog.util';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import {
  EnvironmentEntityMap,
  PersistenceUtilService,
} from '../../persistence/persistence-util.service';
import { CatalogAdoptionService } from './catalog-adoption.service';
import { CatalogEdgePlan, CatalogGraphSyncService } from './catalog-graph-sync.service';
import { CatalogInstanceSyncService } from './catalog-instance-sync.service';

/**
 * Records catalog systems, components, their repository and instances in the graph.
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
    private readonly catalogUtil: CatalogUtil,
  ) {}

  /**
   * Sync systems, then components, then service relationships so document order
   * does not affect links.
   * A failure to sync one entity is logged and does not stop the others.
   * Only a complete repository snapshot authorizes removal of stale edges.
   */
  public async syncRepository(
    repository: CatalogRepository,
    entities: (CatalogComponent | CatalogSystem)[],
    complete = true,
  ): Promise<void> {
    const plan: CatalogEdgePlan = { complete, edges: new Map() };
    if (entities.length === 0) {
      if (complete) {
        await this.graphSyncService.reconcileEdges(repository, plan);
      } else {
        this.logger.warn(`Catalog edge cleanup skipped for ${repository.scmUrl}: the catalog scan is incomplete`);
      }
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

    const components = entities.filter((entity) => entity instanceof CatalogComponent);
    const systems = entities.filter((entity) => entity instanceof CatalogSystem);
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

    let failures = complete ? 0 : 1;
    const projects = new Map<string, VertexEntity>();
    for (const system of systems) {
      try {
        const project = await this.graphSyncService.upsertProject(
          system,
          ProvenanceInfo.catalog(repository.scmUrl, system.path, { adoptable }),
        );
        projects.set(system.name, project);
      } catch (error) {
        plan.complete = false;
        failures++;
        this.logger.warn(
          `Catalog sync failed for ${repository.scmUrl}:${system.path} (${system.name}): ${
            (error as Error).message
          }`,
        );
      }
    }
    const services = new Map<CatalogComponent, VertexEntity>();
    for (const component of components) {
      try {
        const service = await this.syncComponent(
          repository,
          component,
          repositoryVertex,
          envMap,
          adoptable,
          projects,
          plan,
        );
        services.set(component, service);
      } catch (error) {
        plan.complete = false;
        failures++;
        this.logger.warn(
          `Catalog sync failed for ${repository.scmUrl}:${component.path} (${component.name}): ${
            (error as Error).message
          }`,
        );
      }
    }

    for (const [component, service] of services) {
      const relationships = [
        ...(component.subcomponentOf
          ? [{ name: 'subcomponent-of', reference: component.subcomponentOf }]
          : []),
        ...[...new Set(component.dependsOn ?? [])].map((reference) => ({
          name: 'depends-on',
          reference,
        })),
      ];
      const provenance = ProvenanceInfo.catalog(
        repository.scmUrl,
        component.path,
        { adoptable },
      );
      for (const { name, reference } of relationships) {
        const targetName = this.catalogUtil.resolveComponentReference(reference);
        if (!targetName) {
          this.logger.warn(
            `Catalog component ${component.name} (${component.path}) has an unsupported ${name} reference ${reference}; use a Component reference in the default namespace`,
          );
          continue;
        }
        try {
          const target = await this.graphSyncService.getService(targetName);
          if (!target) {
            this.logger.warn(
              `Catalog component ${component.name} (${component.path}) references missing service ${targetName} for ${name}; sync the target Component first`,
            );
            continue;
          }
          await this.graphSyncService.ensureEdge(name, service, target, provenance, { restricted: true, plan });
        } catch (error) {
          plan.complete = false;
          failures++;
          this.logger.warn(
            `Catalog relationship sync failed for ${repository.scmUrl}:${component.path} (${component.name}, ${name}, ${reference}): ${
              (error as Error).message
            }`,
          );
        }
      }
    }

    if (!plan.complete) {
      this.logger.warn(`Catalog edge cleanup skipped for ${repository.scmUrl}: the catalog scan or sync is incomplete`);
    }
    try {
      await this.graphSyncService.reconcileEdges(repository, plan);
    } catch (error) {
      failures++;
      this.logger.warn(`Catalog edge sync failed for ${repository.scmUrl}: ${(error as Error).message}`);
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
    projects: Map<string, VertexEntity>,
    plan: CatalogEdgePlan,
  ): Promise<VertexEntity> {
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
      { plan },
    );
    if (component.system) {
      const projectVertex = projects.get(component.system) ??
        await this.graphSyncService.getProject(component.system);
      if (projectVertex) {
        await this.graphSyncService.ensureEdge(
          'component',
          projectVertex,
          serviceVertex,
          provenance,
          { plan },
        );
      } else {
        this.logger.warn(
          `Catalog component ${component.name} (${component.path}) references missing project ${component.system}; add a kind: System document with metadata.name: ${component.system} to create it`,
        );
      }
    } else {
      this.logger.warn(
        `Catalog component ${component.name} (${component.path}) has no spec.system; skipping project link`,
      );
    }
    if (component.instances) {
      await this.instanceSyncService.sync(
        component.instances,
        serviceVertex,
        envMap,
        provenance,
        plan,
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
    return serviceVertex;
  }
}
