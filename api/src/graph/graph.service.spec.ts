import { beforeEach, describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';
import { AuditService } from '../audit/audit.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { ProvenanceEmbeddable } from '../persistence/entity/provenance.embeddable';
import { ProvenanceInfo } from '../persistence/provenance-info';
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
        service.editEdge(null, 'id', edge, ProvenanceInfo.catalog(repo, 'b/catalog-info.yaml')),
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
        service.editVertex(null, 'id', vertex, true, true, ProvenanceInfo.catalog(repo, 'catalog-info.yaml')),
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

    it('treats missing provenance as manual for catalog updates', async () => {
      graphRepository.getVertex.mockResolvedValue({ provenance: [] });
      const vertex = { collection: 'service', data: {} } as VertexInsertDto;

      await expect(
        service.editVertex(
          null,
          'id',
          vertex,
          true,
          true,
          ProvenanceInfo.catalog(repo, 'catalog-info.yaml'),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(graphRepository.editVertex).not.toHaveBeenCalled();
    });

    it('allows a catalog update from the same catalog file', async () => {
      graphRepository.getEdge.mockResolvedValue({
        provenance: [ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml')],
      });
      graphRepository.editEdge.mockResolvedValue({ toEdgeResponse: () => ({}) });
      vi.spyOn(service, 'publishGraphEvent').mockImplementation(() => undefined);

      const provenance = ProvenanceInfo.catalog(repo, 'catalog-info.yaml');
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
        expect.objectContaining({ type: 'manual', adoptable: false, overwrite: false }),
      );
    });
  });

  describe('isUpdateAllowed', () => {
    const managed = [ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml')];
    const other = ProvenanceInfo.catalog(repo, 'b/catalog-info.yaml');

    it('allows adoptable catalog updates to items with no catalog records', () => {
      const adoptable = ProvenanceInfo.catalog(repo, 'b/catalog-info.yaml', { adoptable: true });
      expect(service.isUpdateAllowed(undefined, adoptable)).toBe(true);
      expect(service.isUpdateAllowed([ProvenanceEmbeddable.manual()], adoptable)).toBe(true);
      expect(service.isUpdateAllowed([ProvenanceEmbeddable.manual()], other)).toBe(false);
    });

    it('denies adoptable catalog updates to items managed by another catalog file', () => {
      expect(
        service.isUpdateAllowed(
          managed,
          ProvenanceInfo.catalog(repo, 'b/catalog-info.yaml', { adoptable: true }),
        ),
      ).toBe(false);
    });

    it('always allows overwrite updates', () => {
      expect(
        service.isUpdateAllowed(
          managed,
          ProvenanceInfo.catalog('https://github.com/bcgov/moved', 'catalog-info.yaml', { overwrite: true }),
        ),
      ).toBe(true);
    });

    it('passes overwrite updates to the repository', async () => {
      graphRepository.getEdge.mockResolvedValue({ provenance: managed });
      graphRepository.editEdge.mockResolvedValue({ toEdgeResponse: () => ({}) });
      vi.spyOn(service, 'publishGraphEvent').mockImplementation(() => undefined);

      const provenance = ProvenanceInfo.catalog(repo, 'b/catalog-info.yaml', { overwrite: true });
      await service.editEdge(null, 'id', { name: 'component', source: 'a', target: 'b' } as EdgeInsertDto, provenance);
      expect(graphRepository.editEdge).toHaveBeenCalledWith('id', expect.anything(), provenance);
    });
  });
});
