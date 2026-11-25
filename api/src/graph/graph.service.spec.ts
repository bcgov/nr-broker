import { beforeEach, describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';
import { AuditService } from '../audit/audit.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { ProvenanceEmbeddable } from '../persistence/entity/provenance.embeddable';
import { ProvenanceInfo } from '../persistence/provenance-info';
import { ProvenanceType } from '../persistence/dto/provenance.dto';
import { EdgeInsertDto } from '../persistence/dto/edge.dto';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';
import { RepositoryBaseDto } from '../persistence/dto/repository.dto';
import { plainToInstance } from 'class-transformer';
import { createMock } from '@golevelup/ts-vitest';
import { RepositoryEntity } from '../persistence/entity/repository.entity';
import { GraphMongoRepository } from '../persistence/mongo/graph-mongo.repository';
import { VertexEntity } from '../persistence/entity/vertex.entity';
import { ObjectId } from 'mongodb';
import { EdgeEntity } from '../persistence/entity/edge.entity';

describe('GraphService', () => {
  const repo = 'https://github.com/org/repo';
  let service: GraphService;
  let auditService: { recordGraphAction: ReturnType<typeof vi.fn> };
  let graphRepository: {
    getEdge: ReturnType<typeof vi.fn>;
    editEdge: ReturnType<typeof vi.fn>;
    getVertex: ReturnType<typeof vi.fn>;
    editVertex: ReturnType<typeof vi.fn>;
    updateSyncStatus: ReturnType<typeof vi.fn>;
    deleteVertexProvenance: ReturnType<typeof vi.fn>;
    deleteEdgeProvenance: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    auditService = { recordGraphAction: vi.fn() };
    graphRepository = {
      getEdge: vi.fn(),
      editEdge: vi.fn(),
      getVertex: vi.fn(),
      editVertex: vi.fn(),
      updateSyncStatus: vi.fn(),
      deleteVertexProvenance: vi.fn(),
      deleteEdgeProvenance: vi.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        { provide: AuditService, useValue: auditService },
        { provide: GraphRepository, useValue: graphRepository },
      ],
    })
      .useMocker(() => {
        return createMock({ getCollectionConfigByName: vi.fn(), publish: vi.fn() });
      })
      .compile();

    service = module.get<GraphService>(GraphService);
  });

  describe('sync status persistence', () => {
    const vertexId = new ObjectId();
    const vertex = createMock<VertexEntity>({ id: vertexId.toString(), collection: 'repository' });
    let updateOne: ReturnType<typeof vi.fn>;
    let repository: GraphMongoRepository;

    beforeEach(() => {
      updateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
      repository = new GraphMongoRepository(
        createMock({ findOne: vi.fn().mockResolvedValue({ fields: { syncCatalogStatus: { type: 'embeddedDoc' } } }) }),
        createMock(), createMock(), createMock(), createMock(), createMock(),
        createMock({ getRepository: vi.fn().mockReturnValue({ getCollection: () => ({ updateOne }) }) }),
      );
    });

    describe('edge cardinality', () => {
      const sourceA = new ObjectId();
      const sourceB = new ObjectId();
      const sourceC = new ObjectId();
      const targetA = new ObjectId();
      const targetB = new ObjectId();
      const sharedTarget = new ObjectId();
      let relation: 'oneToMany' | 'manyToMany' | 'oneToOne';
      let storedEdges: EdgeEntity[];
      let repository: GraphMongoRepository;

      beforeEach(() => {
        relation = 'oneToMany';
        storedEdges = [];
        const vertices = new Map([
          [sourceA.toString(), { collection: 'project' }],
          [sourceB.toString(), { collection: 'project' }],
          [sourceC.toString(), { collection: 'team' }],
          [targetA.toString(), { collection: 'service' }],
          [targetB.toString(), { collection: 'service' }],
          [sharedTarget.toString(), { collection: 'repository' }],
        ]);
        repository = new GraphMongoRepository(
          createMock({
            findOne: vi.fn().mockImplementation(({ collection }) => Promise.resolve(
              collection === 'project' || collection === 'team'
                ? { index: collection === 'project' ? 1 : 3, edges: [
                    { name: 'component', collection: 'service', relation },
                    { name: 'component', collection: 'repository', relation: 'manyToMany' },
                  ] }
                : { index: collection === 'service' ? 2 : 4 },
            )),
          }),
          createMock({
            count: vi.fn().mockImplementation(async (filter) => storedEdges.filter((edge) =>
              Object.entries(filter).every(([key, value]) => {
                const actual = edge[key as keyof EdgeEntity];
                return value instanceof ObjectId
                  ? actual instanceof ObjectId && actual.equals(value)
                  : actual === value;
              }),
            ).length),
          }),
          createMock({
            findOne: vi.fn().mockImplementation(async ({ _id }) => vertices.get(_id.toString()) ?? null),
            aggregate: vi.fn().mockResolvedValue([]),
          }),
          createMock(), createMock(), createMock(),
          createMock({
            persist: vi.fn().mockImplementation((edge: EdgeEntity) => {
              edge.id = new ObjectId().toString();
              storedEdges.push(edge);
            }),
            flush: vi.fn().mockResolvedValue(undefined),
          }),
        );
      });

      const addEdge = (source: ObjectId, target: ObjectId) => repository.addEdge(
        { name: 'component', source: source.toString(), target: target.toString() },
        ProvenanceInfo.manual(),
      );

      it('allows one parent multiple children but rejects a second parent for a child', async () => {
        await addEdge(sourceA, targetA);
        await addEdge(sourceA, targetB);

        await expect(addEdge(sourceB, targetA)).rejects.toThrow('One-to-many relation already has a parent');
        expect(storedEdges).toHaveLength(2);
      });

      it('allows multiple parents for a many-to-many relationship', async () => {
        relation = 'manyToMany';

        await addEdge(sourceA, targetA);
        await addEdge(sourceB, targetA);

        expect(storedEdges).toHaveLength(2);
      });

      it('uses the configured target collection and scopes parent checks to the source collection', async () => {
        await addEdge(sourceA, targetA);
        await addEdge(sourceC, targetA);
        await addEdge(sourceA, sharedTarget);
        await addEdge(sourceB, sharedTarget);

        expect(storedEdges).toHaveLength(4);
      });

      it('preserves one-to-one source and duplicate edge checks', async () => {
        relation = 'oneToOne';
        await addEdge(sourceA, targetA);

        await expect(addEdge(sourceA, targetA)).rejects.toThrow('No duplicate edges');
        await expect(addEdge(sourceA, targetB)).rejects.toThrow('One-to-one relation already exists');
        await addEdge(sourceB, targetA);
      });
    });

    it('updates only queue time, preserving any newer result and unrelated collection fields', async () => {
      await repository.updateSyncStatus(vertex, 'syncCatalogStatus', 'queuedAt');

      expect(updateOne).toHaveBeenCalledWith(
        { vertex: vertexId },
        [{ $set: { syncCatalogStatus: { $mergeObjects: [
          { $ifNull: ['$syncCatalogStatus', {}] },
          { $literal: { queuedAt: expect.any(Date) } },
        ] } } }],
      );
    });

    it('updates the final result atomically while preserving queued time and clearing old errors', async () => {
      await repository.updateSyncStatus(vertex, 'syncCatalogStatus', 'syncAt', { state: 'success' });

      expect(updateOne).toHaveBeenCalledWith(
        { vertex: vertexId },
        [
          { $set: { syncCatalogStatus: { $mergeObjects: [
            { $ifNull: ['$syncCatalogStatus', {}] },
            { $literal: { syncAt: expect.any(Date), state: 'success' } },
          ] } } },
          { $unset: ['syncCatalogStatus.errorCode', 'syncCatalogStatus.errorMessage'] },
        ],
      );
    });

    it('surfaces a missing target rather than creating a partial collection record', async () => {
      updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(repository.updateSyncStatus(vertex, 'syncCatalogStatus', 'syncAt', {
        state: 'failure', errorCode: '403', errorMessage: '$denied',
      })).rejects.toThrow('was not found');
      expect(updateOne.mock.calls[0][1][0].$set.syncCatalogStatus.$mergeObjects[1]).toEqual({
        $literal: { syncAt: expect.any(Date), state: 'failure', errorCode: '403', errorMessage: '$denied' },
      });
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('awaits status persistence and does not publish a success event when the write fails', async () => {
    const repository = plainToInstance(RepositoryEntity, {
      vertex: 'v1',
      syncCatalogStatus: {
        queuedAt: new Date(1000), state: 'failure', errorCode: '403', errorMessage: 'Old failure',
      },
    });
    graphRepository.getVertex.mockResolvedValue({ id: 'v1', collection: 'repository' });
    vi.spyOn(service['collectionRepository'], 'getCollectionConfigByName').mockResolvedValue(createMock({ index: 'repository' }));
    const publish = vi.spyOn(service['redisService'], 'publish');
    let rejectWrite!: (error: Error) => void;
    graphRepository.updateSyncStatus.mockReturnValue(new Promise((_resolve, reject) => {
      rejectWrite = reject;
    }));
    let settled = false;
    const update = service.updateSyncStatus(repository, 'syncCatalogStatus', 'syncAt', { state: 'success' });
    const checked = expect(update).rejects.toThrow('Status write failed');
    void update.then(() => {
      settled = true;
    }, () => {
      settled = true;
    });
    await vi.waitFor(() => expect(graphRepository.updateSyncStatus).toHaveBeenCalled());

    expect(settled).toBe(false);
    expect(graphRepository.updateSyncStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'v1' }), 'syncCatalogStatus', 'syncAt', { state: 'success' },
    );
    rejectWrite(new Error('Status write failed'));
    await checked;
    expect(publish).not.toHaveBeenCalled();
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

  describe('deleteVertexProvenance', () => {
    it('removes a matching record and audits it', async () => {
      graphRepository.getVertex.mockResolvedValue({
        provenance: [
          ProvenanceEmbeddable.manual(),
          ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml'),
        ],
      });
      graphRepository.deleteVertexProvenance.mockResolvedValue({
        collection: 'service',
        __helper: { toJSON: () => ({}) },
      });
      (service as any).collectionRepository.getCollectionConfigByName = vi
        .fn()
        .mockResolvedValue({ index: 'service' });
      vi.spyOn(service, 'publishGraphEvent').mockImplementation(() => undefined);

      await service.deleteVertexProvenance(null, 'id', ProvenanceType.CATALOG);
      expect(graphRepository.deleteVertexProvenance).toHaveBeenCalledWith('id', ProvenanceType.CATALOG);
      expect(auditService.recordGraphAction).toHaveBeenCalledWith(
        null,
        'graph-vertex-provenance-delete',
        null,
        'success',
        'vertex',
        'id',
      );
    });

    it('returns not found when no record has the type', async () => {
      graphRepository.getVertex.mockResolvedValue({
        provenance: [ProvenanceEmbeddable.manual()],
      });

      await expect(
        service.deleteVertexProvenance(null, 'id', ProvenanceType.CATALOG),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(graphRepository.deleteVertexProvenance).not.toHaveBeenCalled();
    });

    it('returns not found when the vertex has no records', async () => {
      graphRepository.getVertex.mockResolvedValue({});

      await expect(
        service.deleteVertexProvenance(null, 'id', ProvenanceType.MANUAL),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteEdgeProvenance', () => {
    it('removes a matching record and audits it', async () => {
      graphRepository.getEdge.mockResolvedValue({
        provenance: [ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml')],
      });
      graphRepository.deleteEdgeProvenance.mockResolvedValue({
        toEdgeResponse: () => ({ id: 'id' }),
      });
      vi.spyOn(service, 'publishGraphEvent').mockImplementation(() => undefined);

      const result = await service.deleteEdgeProvenance(null, 'id', ProvenanceType.CATALOG);
      expect(result).toEqual({ id: 'id' });
      expect(graphRepository.deleteEdgeProvenance).toHaveBeenCalledWith('id', ProvenanceType.CATALOG);
      expect(auditService.recordGraphAction).toHaveBeenCalledWith(
        null,
        'graph-edge-provenance-delete',
        null,
        'success',
        'edge',
        'id',
      );
    });

    it('returns not found when no record matches', async () => {
      graphRepository.getEdge.mockResolvedValue({
        provenance: [ProvenanceEmbeddable.manual()],
      });

      await expect(
        service.deleteEdgeProvenance(null, 'id', ProvenanceType.CATALOG),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(graphRepository.deleteEdgeProvenance).not.toHaveBeenCalled();
    });
  });

  describe('editVertex validation', () => {
    const edit = (ignoreBlankFields: boolean) => {
      const data = plainToInstance(RepositoryBaseDto, { name: 'repo' });
      const collectionRepository = (service as any).collectionRepository;
      collectionRepository.getCollectionConfigByName = vi.fn().mockResolvedValue({
        fields: { name: { type: 'string' } },
        collectionMapper: [{ setPath: 'name', getPath: 'name' }],
        permissions: {},
      });
      (service as any).validatorUtil.buildFirstFailedPropertyErrorMsg = vi.fn().mockReturnValue('invalid');
      collectionRepository.assignCollection = vi.fn().mockReturnValue(data);
      collectionRepository.getCollectionByVertexId = vi.fn().mockResolvedValue({ name: 'repo' });
      graphRepository.getVertex.mockResolvedValue({ provenance: [] });
      graphRepository.editVertex.mockResolvedValue({
        collection: 'repository',
        __helper: { toJSON: () => ({}) },
      });
      vi.spyOn(service, 'publishGraphEvent').mockImplementation(() => undefined);
      return service.editVertex(
        null,
        'id',
        new VertexInsertDto('repository', data),
        true,
        ignoreBlankFields,
      );
    };

    it('skips missing required fields when ignoring blank fields', async () => {
      await edit(true);
      expect(graphRepository.editVertex).toHaveBeenCalled();
    });

    it('rejects missing required fields otherwise', async () => {
      await expect(edit(false)).rejects.toBeInstanceOf(BadRequestException);
      expect(graphRepository.editVertex).not.toHaveBeenCalled();
    });
  });

  describe('upsertVertex unchanged check', () => {
    const provenance = ProvenanceInfo.intention('i1');
    const insert = {
      collection: 'service',
      data: { name: 'svc', title: 'Svc' },
    } as unknown as VertexInsertDto;
    let collectionRepository: {
      getCollectionConfigByName: ReturnType<typeof vi.fn>;
      getCollectionByVertexId: ReturnType<typeof vi.fn>;
    };
    const curVertex = () => ({
      id: { toString: () => 'vid' },
      name: 'svc',
      provenance: [ProvenanceEmbeddable.intention('i0')],
    });

    beforeEach(() => {
      collectionRepository = (service as any).collectionRepository;
      collectionRepository.getCollectionConfigByName = vi.fn().mockResolvedValue({
        fields: { name: { type: 'string' }, title: { type: 'string' } },
        collectionMapper: [{ setPath: 'name', getPath: 'name' }],
      });
      graphRepository.getVertex.mockResolvedValue(curVertex());
    });

    it('skips the edit when no field changes', async () => {
      collectionRepository.getCollectionByVertexId = vi
        .fn()
        .mockResolvedValue({ name: 'svc', title: 'Svc', other: 1 });

      const result = await service.upsertVertex(null, insert, 'id', 'vid', provenance);
      expect(result).toMatchObject({ name: 'svc' });
      expect(graphRepository.editVertex).not.toHaveBeenCalled();
      expect(auditService.recordGraphAction).not.toHaveBeenCalled();
    });

    it('adds the vertex as given when none is found', async () => {
      graphRepository.getVertexByName = vi.fn().mockResolvedValue(null);
      collectionRepository.getCollectionConfigByName = vi.fn().mockResolvedValue({
        fields: { name: { type: 'string', unique: true }, title: { type: 'string' } },
        collectionMapper: [{ setPath: 'name', getPath: 'name' }],
        collectionVertexName: 'name',
      });
      vi.spyOn(service, 'addVertex').mockResolvedValue({} as any);

      await service.upsertVertex(null, insert, 'name', 'svc', provenance);
      expect((service.addVertex as any).mock.calls[0][1]).toBe(insert);
    });

    it('edits with the vertex insert as given', async () => {
      collectionRepository.getCollectionByVertexId = vi
        .fn()
        .mockResolvedValue({ name: 'svc', title: 'Old' });
      vi.spyOn(service, 'editVertex').mockResolvedValue({} as any);

      await service.upsertVertex(null, insert, 'id', 'vid', provenance);
      expect((service.editVertex as any).mock.calls[0][1]).toBe('vid');
      expect((service.editVertex as any).mock.calls[0][2]).toBe(insert);
    });

    it('adds the vertex as given when the id target is null', async () => {
      vi.spyOn(service, 'addVertex').mockResolvedValue({} as any);

      await service.upsertVertex(null, insert, 'id', null, provenance);
      expect((service.addVertex as any).mock.calls[0][1]).toBe(insert);
    });

    it('edits when a field changes', async () => {
      collectionRepository.getCollectionByVertexId = vi
        .fn()
        .mockResolvedValue({ name: 'svc', title: 'Old' });
      vi.spyOn(service, 'editVertex').mockResolvedValue({} as any);

      await service.upsertVertex(null, insert, 'id', 'vid', provenance);
      expect(service.editVertex).toHaveBeenCalled();
    });

    it('edits when the provenance record is new', async () => {
      graphRepository.getVertex.mockResolvedValue({ ...curVertex(), provenance: [] });
      collectionRepository.getCollectionByVertexId = vi
        .fn()
        .mockResolvedValue({ name: 'svc', title: 'Svc' });
      vi.spyOn(service, 'editVertex').mockResolvedValue({} as any);

      await service.upsertVertex(null, insert, 'id', 'vid', provenance);
      expect(service.editVertex).toHaveBeenCalled();
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
