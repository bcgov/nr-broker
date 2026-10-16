import { beforeEach, describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';
import { AuditService } from '../audit/audit.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { ProvenanceEmbeddable } from '../persistence/entity/provenance.embeddable';
import { EdgeInsertDto } from '../persistence/dto/edge.dto';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';

describe('GraphService', () => {
  const repo = 'https://github.com/org/repo';
  let service: GraphService;
  let auditService: { recordGraphAction: ReturnType<typeof vi.fn> };
  let graphRepository: {
    getEdge: ReturnType<typeof vi.fn>;
    editEdge: ReturnType<typeof vi.fn>;
    getVertex: ReturnType<typeof vi.fn>;
    editVertex: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    auditService = { recordGraphAction: vi.fn() };
    graphRepository = {
      getEdge: vi.fn(),
      editEdge: vi.fn(),
      getVertex: vi.fn(),
      editVertex: vi.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        { provide: AuditService, useValue: auditService },
        { provide: GraphRepository, useValue: graphRepository },
      ],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<GraphService>(GraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('catalog provenance', () => {
    const edge = { name: 'component', source: 'a', target: 'b' } as EdgeInsertDto;

    it('denies and audits a catalog edge update from another catalog file', async () => {
      graphRepository.getEdge.mockResolvedValue({
        provenance: [
          ProvenanceEmbeddable.manual(),
          ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml'),
        ],
      });

      await expect(
        service.editEdge(null, 'id', edge, ProvenanceEmbeddable.catalog(repo, 'b/catalog-info.yaml')),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(graphRepository.editEdge).not.toHaveBeenCalled();
      expect(auditService.recordGraphAction).toHaveBeenCalledWith(
        null,
        'graph-edge-edit',
        null,
        'failure',
        'edge',
        edge,
      );
    });

    it('denies a catalog vertex update to an item without catalog provenance', async () => {
      graphRepository.getVertex.mockResolvedValue({
        provenance: [ProvenanceEmbeddable.manual()],
      });
      const vertex = { collection: 'service', data: {} } as VertexInsertDto;

      await expect(
        service.editVertex(null, 'id', vertex, true, true, ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml')),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(graphRepository.editVertex).not.toHaveBeenCalled();
      expect(auditService.recordGraphAction).toHaveBeenCalledWith(
        null,
        'graph-vertex-edit',
        null,
        'failure',
        'vertex',
        vertex,
      );
    });

    it('allows a catalog update from the same catalog file', async () => {
      graphRepository.getEdge.mockResolvedValue({
        provenance: [ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml')],
      });
      graphRepository.editEdge.mockResolvedValue({ toEdgeResponse: () => ({}) });
      vi.spyOn(service, 'publishGraphEvent').mockImplementation(() => undefined);

      const provenance = ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml');
      await service.editEdge(null, 'id', edge, provenance);
      expect(graphRepository.editEdge).toHaveBeenCalledWith('id', edge, provenance);
    });

    it('allows non-catalog updates to catalog items', async () => {
      graphRepository.getEdge.mockResolvedValue({
        provenance: [ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml')],
      });
      graphRepository.editEdge.mockResolvedValue({ toEdgeResponse: () => ({}) });
      vi.spyOn(service, 'publishGraphEvent').mockImplementation(() => undefined);

      await service.editEdge(null, 'id', edge);
      expect(graphRepository.editEdge).toHaveBeenCalledWith(
        'id',
        edge,
        expect.objectContaining({ type: 'manual' }),
      );
    });
  });
});
