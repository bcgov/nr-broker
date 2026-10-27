import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponentInstance } from '../../catalog/catalog-component-instance';
import { EnvironmentEntityMap } from '../../persistence/persistence-util.service';
import { EdgeInsertDto } from '../../persistence/dto/edge.dto';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import { GraphRepository } from '../../persistence/interfaces/graph.repository';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { GraphService } from '../graph.service';
import { CatalogGraphSyncService } from './catalog-graph-sync.service';

@Injectable()
export class CatalogInstanceSyncService {
  constructor(
    private readonly auditService: AuditService,
    private readonly graphRepository: GraphRepository,
    private readonly graphService: GraphService,
    private readonly catalogGraphSyncService: CatalogGraphSyncService,
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
  ): Promise<void> {
    const failures: string[] = [];
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

        const instanceVertex = await this.catalogGraphSyncService.upsertVertex(
          'serviceInstance',
          existing,
          { name: instance.name, url: instance.url },
          provenance,
        );
        await this.catalogGraphSyncService.ensureEdge(
          'instance',
          serviceVertex,
          instanceVertex,
          provenance,
        );
        if (deployTypes.length === 0) {
          await this.graphService.addEdge(
            null,
            plainToInstance(EdgeInsertDto, {
              name: 'deploy-type',
              source: instanceVertex.id.toString(),
              target: envVertexId,
            }),
            provenance,
          );
        }
      } catch (error) {
        failures.push(`${instance.name}: ${(error as Error).message}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(`Instance sync failed (${failures.join('; ')})`);
    }
  }
}
