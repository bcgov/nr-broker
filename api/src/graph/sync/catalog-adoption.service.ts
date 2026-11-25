import { Injectable } from '@nestjs/common';
import { EdgeInsertDto } from '../../persistence/dto/edge.dto';
import { VertexInsertDto } from '../../persistence/dto/vertex.dto';
import { EdgeEntity } from '../../persistence/entity/edge.entity';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { GraphService } from '../graph.service';

@Injectable()
export class CatalogAdoptionService {
  constructor(private readonly graphService: GraphService) {}

  provenance(repository: string, path: string): ProvenanceInfo {
    return ProvenanceInfo.catalog(repository, path, { adoptable: true });
  }

  upsertVertex(
    vertex: VertexInsertDto,
    existing: VertexEntity | null,
    provenance: ProvenanceInfo,
  ): Promise<VertexEntity> {
    return this.graphService.upsertVertex(
      null,
      vertex,
      'id',
      existing?.id.toString() ?? null,
      provenance,
    );
  }

  async adoptEdge(
    existing: EdgeEntity,
    edge: EdgeInsertDto,
    provenance: ProvenanceInfo,
  ): Promise<void> {
    if (!existing.provenance?.some((record) => provenance.record.matches(record))) {
      await this.graphService.editEdge(null, existing.id.toString(), edge, provenance);
    }
  }
}
