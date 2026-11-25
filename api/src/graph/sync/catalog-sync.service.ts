import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { CatalogSystem } from '../../catalog/catalog-system';
import { CatalogUtil } from '../../util/catalog.util';
import { GITHUB_CATALOG_ROOT_FILE } from '../../constants';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import {
  EnvironmentEntityMap,
  PersistenceUtilService,
} from '../../persistence/persistence-util.service';
import { CatalogAdoptionService } from './catalog-adoption.service';
import { CatalogEdgePlan, CatalogGraphSyncService } from './catalog-graph-sync.service';
import { CatalogInstanceSyncService } from './catalog-instance-sync.service';
import { SyncResult } from '../../persistence/dto/sync-status.dto';
import { syncFailure, syncMessage, syncOutcome } from '../../util/sync-result.util';

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
  ): Promise<SyncResult> {
    this.auditService.recordGitHubCatalogSync(
      'start',
      'unknown',
      `Start catalog sync: ${repository.scmUrl}`,
      {
        repository: repository.name,
        repositoryUrl: repository.scmUrl,
      },
    );

    const result = await this.syncEntities(repository, entities, complete);
    this.auditService.recordGitHubCatalogSync(
      'end',
      syncOutcome(result),
      syncMessage('Catalog sync', repository.scmUrl, result),
      {
        repository: repository.name,
        repositoryUrl: repository.scmUrl,
        ...(result.errorMessage ? { failure: result } : {}),
      },
    );
    return result;
  }

  private async syncEntities(
    repository: CatalogRepository,
    entities: (CatalogComponent | CatalogSystem)[],
    complete: boolean,
  ): Promise<SyncResult> {
    const failures: SyncResult[] = complete
      ? []
      : [{
          state: 'partial',
          errorCode: 'CATALOG_SCAN_INCOMPLETE',
          errorMessage: 'The catalog scan is incomplete. Check the catalog scan audit messages and retry.',
        }];
    const plan: CatalogEdgePlan = { complete, edges: new Map(), failures };
    if (entities.length === 0) {
      if (complete) {
        await this.graphSyncService.reconcileEdges(repository, plan);
      }
      return failures[0] ?? { state: 'success' };
    }
    const components = entities.filter((entity) => entity instanceof CatalogComponent);
    const systems = entities.filter((entity) => entity instanceof CatalogSystem);
    const envMap = components.some((component) => component.instances?.length)
      ? await this.persistenceUtilService.getEnvMap()
      : {};
    const existingRepository = await this.graphSyncService.getRepository(
      repository.scmUrl,
    );
    const repositoryVertex = await this.graphSyncService.upsertRepository(
      repository,
      existingRepository,
      this.adoptionService.provenance(repository.scmUrl, GITHUB_CATALOG_ROOT_FILE),
      plan,
    );

    const projects = new Map<string, VertexEntity>();
    for (const system of systems) {
      try {
        const project = await this.graphSyncService.upsertProject(
          system,
          this.adoptionService.provenance(repository.scmUrl, system.path),
          plan,
        );
        projects.set(system.name, project);
      } catch (error) {
        plan.complete = false;
        failures.push(syncFailure(error));
        this.logger.warn(
          `Catalog sync failed for ${repository.scmUrl}:${system.path} (${system.name}): ${
            syncFailure(error).errorMessage
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
          projects,
          plan,
        );
        services.set(component, service);
      } catch (error) {
        plan.complete = false;
        failures.push(syncFailure(error));
        this.logger.warn(
          `Catalog sync failed for ${repository.scmUrl}:${component.path} (${component.name}): ${
            syncFailure(error).errorMessage
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
      const provenance = this.adoptionService.provenance(
        repository.scmUrl,
        component.path,
      );
      for (const { name, reference } of relationships) {
        const targetName = this.catalogUtil.resolveComponentReference(reference);
        if (!targetName) {
          failures.push(syncFailure(`Unsupported ${name} reference ${reference} for ${component.name}. Use a Component reference in the default namespace.`));
          this.logger.warn(
            `Catalog component ${component.name} (${component.path}) has an unsupported ${name} reference ${reference}; use a Component reference in the default namespace`,
          );
          continue;
        }
        try {
          const target = await this.graphSyncService.getService(targetName);
          if (!target) {
            failures.push(syncFailure(`Service ${targetName} referenced by ${component.name} does not exist. Sync the target Component first.`));
            this.logger.warn(
              `Catalog component ${component.name} (${component.path}) references missing service ${targetName} for ${name}; sync the target Component first`,
            );
            continue;
          }
          await this.graphSyncService.ensureEdge(name, service, target, provenance, { plan });
        } catch (error) {
          plan.complete = false;
          failures.push(syncFailure(error));
          this.logger.warn(
            `Catalog relationship sync failed for ${repository.scmUrl}:${component.path} (${component.name}, ${name}, ${reference}): ${
              syncFailure(error).errorMessage
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
      failures.push(syncFailure(error));
      this.logger.warn(`Catalog edge sync failed for ${repository.scmUrl}: ${syncFailure(error).errorMessage}`);
    }

    if (failures.length > 0 || !plan.complete) {
      return {
        state: 'partial',
        errorCode: failures.find((failure) => failure.errorCode)?.errorCode ?? 'CATALOG_SYNC_INCOMPLETE',
        errorMessage: failures.length > 0
          ? failures.map((failure) => failure.errorMessage).join('; ')
          : 'Some catalog items could not be synced. Check catalog ownership and retry.',
      };
    }
    return { state: 'success' };
  }

  private async syncComponent(
    repository: CatalogRepository,
    component: CatalogComponent,
    repositoryVertex: VertexEntity,
    envMap: EnvironmentEntityMap,
    projects: Map<string, VertexEntity>,
    plan: CatalogEdgePlan,
  ): Promise<VertexEntity> {
    const provenance = this.adoptionService.provenance(
      repository.scmUrl,
      component.path,
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
        plan.failures?.push(syncFailure(`Project ${component.system} referenced by ${component.name} does not exist. Add a matching System document and retry.`));
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
