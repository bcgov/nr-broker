import { Injectable, Logger } from '@nestjs/common';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { ProvenanceType } from '../../persistence/dto/provenance.dto';
import { ProvenanceEmbeddable } from '../../persistence/entity/provenance.embeddable';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import { GraphRepository } from '../../persistence/interfaces/graph.repository';

@Injectable()
export class CatalogAdoptionService {
  private readonly logger = new Logger(CatalogAdoptionService.name);

  constructor(private readonly graphRepository: GraphRepository) {}

  /**
   * Adoption is limited to services that already belong exclusively to this
   * repository, have no competing catalog owner, and are in the declared system.
   */
  public async canAdopt(
    repository: CatalogRepository,
    components: CatalogComponent[],
    repositoryVertex: VertexEntity | null,
  ): Promise<boolean> {
    if (!repositoryVertex) {
      return false;
    }

    const repositoryId = repositoryVertex.id.toString();
    const linkedServices = await this.graphRepository.searchEdgesShallow(
      'source',
      undefined,
      repositoryId,
    );
    if (linkedServices.length === 0) {
      return false;
    }

    const block = (component: CatalogComponent, reason: string) => {
      this.logger.warn(
        `Catalog ${repository.scmUrl} cannot adopt existing items. Service ${component.name} (${component.path}): ${reason}`,
      );
      return false;
    };
    const declared = new Set<string>();
    for (const component of components) {
      if (!component.system) {
        continue;
      }
      if (declared.has(component.name)) {
        return block(
          component,
          'more than one component in this repository declares the service',
        );
      }
      declared.add(component.name);

      const service = await this.graphRepository.getVertexByName(
        'service',
        component.name,
      );
      if (!service) {
        continue;
      }
      const serviceId = service.id.toString();
      const record = ProvenanceEmbeddable.catalog(
        repository.scmUrl,
        component.path,
      );
      if (
        (service.provenance ?? []).some(
          (existing) =>
            existing.type === ProvenanceType.CATALOG &&
            !record.matches(existing),
        )
      ) {
        return block(component, 'the service is managed by another catalog file');
      }

      const sourceEdges = await this.graphRepository.searchEdgesShallow(
        'source',
        serviceId,
      );
      if (
        sourceEdges.length !== 1 ||
        sourceEdges[0].target.toString() !== repositoryId
      ) {
        return block(
          component,
          'the service must be linked to this repository and no other',
        );
      }

      const projectEdges = await this.graphRepository.searchEdgesShallow(
        'component',
        undefined,
        serviceId,
      );
      if (projectEdges.length !== 1) {
        return block(component, 'the service must be in exactly one project');
      }
      const project = await this.graphRepository.getVertex(
        projectEdges[0].source.toString(),
      );
      if (project?.name !== component.system) {
        return block(
          component,
          `the service is in project ${project?.name ?? 'unknown'}, not ${component.system}`,
        );
      }
    }

    return true;
  }
}
