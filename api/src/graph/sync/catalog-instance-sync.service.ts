import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponentInstance } from '../../catalog/catalog-component-instance';
import { EnvironmentEntityMap } from '../../persistence/persistence-util.service';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import { GraphRepository } from '../../persistence/interfaces/graph.repository';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { GraphService } from '../graph.service';
import { CatalogEdgePlan, CatalogGraphSyncService } from './catalog-graph-sync.service';
import { syncFailure } from '../../util/sync-result.util';
import { SyncResult } from '../../persistence/dto/sync-status.dto';
import { CatalogAdoptionService } from './catalog-adoption.service';

@Injectable()
export class CatalogInstanceSyncService {
  constructor(
    private readonly auditService: AuditService,
    private readonly graphRepository: GraphRepository,
    private readonly graphService: GraphService,
    private readonly catalogGraphSyncService: CatalogGraphSyncService,
    private readonly adoptionService: CatalogAdoptionService,
  ) {}

  /**
   * Try every instance before reporting failures. An existing instance is
   * changed only when this catalog owns it and it is already in this environment.
   */
  public async sync(
    instances: CatalogComponentInstance[],
    serviceVertex: VertexEntity,
    envMap: EnvironmentEntityMap,
    provenance: ProvenanceInfo,
    plan?: CatalogEdgePlan,
  ): Promise<void> {
    const failures: SyncResult[] = [];
    for (const instance of instances) {
      try {
        const env = envMap[instance.env];
        if (!env) {
          throw new Error(`environment ${instance.env} does not exist`);
        }
        const existing = await this.graphRepository.getVertexByParentIdAndName(
          'serviceInstance',
          serviceVertex.id.toString(),
          instance.name,
        );
        if (
          existing &&
          !this.graphService.isUpdateAllowed(existing.provenance, provenance)
        ) {
          if (plan) {
            plan.complete = false;
            plan.failures?.push(syncFailure(`Catalog does not manage instance ${instance.name} of ${serviceVertex.name}. Check catalog ownership before retrying.`));
          }
          this.auditService.recordGitHubCatalogSync(
            'info',
            'unknown',
            `Catalog ${provenance.record.repository}:${provenance.record.path} does not manage instance ${instance.name} of ${serviceVertex.name}; skipping`,
            {
              repositoryUrl: provenance.record.repository,
              catalogPath: provenance.record.path,
            },
          );
          continue;
        }

        const envVertexId = env.vertex.toString();
        const deployTypes = existing
          ? await this.graphRepository.searchEdgesShallow(
              'deploy-type',
              existing.id.toString(),
            )
          : [];
        if (deployTypes.some((edge) => edge.target.toString() !== envVertexId)) {
          throw new Error(
            'the instance is already in another environment. Remove the instance in Broker or give it a new name.',
          );
        }

        const instanceVertex = await this.adoptionService.upsertVertex(
          await this.catalogGraphSyncService.buildVertexInsert(
            'serviceInstance',
            existing,
            { name: instance.name, url: instance.url },
          ),
          existing,
          provenance,
        );
        await this.catalogGraphSyncService.ensureEdge(
          'instance',
          serviceVertex,
          instanceVertex,
          provenance,
          { plan },
        );
        await this.catalogGraphSyncService.ensureEdge(
          'deploy-type',
          instanceVertex,
          { id: envVertexId, collection: 'environment' },
          provenance,
          { plan },
        );
      } catch (error) {
        const failure = syncFailure(error);
        failures.push({ ...failure, errorMessage: `${instance.name}: ${failure.errorMessage}` });
      }
    }
    if (failures.length > 0) {
      throw Object.assign(
        new Error(`Instance sync failed (${failures.map((failure) => failure.errorMessage).join('; ')})`, {
          cause: failures.find((failure) => failure.errorCode) ?? failures[0],
        }),
        { code: failures.find((failure) => failure.errorCode)?.errorCode },
      );
    }
  }
}
