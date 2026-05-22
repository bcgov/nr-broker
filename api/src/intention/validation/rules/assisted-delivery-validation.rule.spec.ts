import { beforeEach, describe, it, expect, vi } from 'vitest';
import { AssistedDeliveryValidationRule } from './assisted-delivery-validation.rule';
import { DecisionContext } from '../decision-context.interface';
import { CollectionRepository } from '../../../persistence/interfaces/collection.repository';
import { GraphRepository } from '../../../persistence/interfaces/graph.repository';
import { PersistenceUtilService } from '../../../persistence/persistence-util.service';

describe('AssistedDeliveryValidationRule', () => {
  let rule: AssistedDeliveryValidationRule;
  let collectionRepository: CollectionRepository;
  let graphRepository: GraphRepository;
  let persistenceUtil: PersistenceUtilService;

  beforeEach(() => {
    collectionRepository = {
      getCollectionByKeyValue: vi.fn(),
    } as unknown as CollectionRepository;
    graphRepository = {
      getEdgeByNameAndVertices: vi.fn(),
    } as unknown as GraphRepository;
    persistenceUtil = {
      testAccess: vi.fn(),
    } as unknown as PersistenceUtilService;

    rule = new AssistedDeliveryValidationRule(
      collectionRepository,
      graphRepository,
      persistenceUtil,
    );
  });

  function createContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
    return {
      intention: {} as any,
      action: {
        service: {
          project: 'my-project',
          name: 'my-service',
          environment: 'test',
        },
      } as any,
      account: null,
      accountBoundProjects: null,
      user: { vertex: 'user-vertex' } as any,
      targetServices: [],
      requireProjectExists: false,
      requireServiceExists: false,
      ...overrides,
    };
  }

  it('should pass when project or service does not exist', async () => {
    vi.mocked(collectionRepository.getCollectionByKeyValue)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const context = createContext();
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should fail when component edge does not exist', async () => {
    vi.mocked(collectionRepository.getCollectionByKeyValue)
      .mockResolvedValueOnce({ vertex: 'project-vtx' } as any)
      .mockResolvedValueOnce({ vertex: 'service-vtx' } as any)
      .mockResolvedValueOnce({ changeRoles: ['change'] } as any);
    vi.mocked(graphRepository.getEdgeByNameAndVertices).mockResolvedValue(null);

    const context = createContext();
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.key).toBe('service.name');
  });

  it('should pass when graph access is granted', async () => {
    const edge = {
      getPropAsArray: vi.fn().mockReturnValue(['role-a']),
    };
    vi.mocked(collectionRepository.getCollectionByKeyValue)
      .mockResolvedValueOnce({ vertex: 'project-vtx' } as any)
      .mockResolvedValueOnce({ vertex: 'service-vtx' } as any)
      .mockResolvedValueOnce({ changeRoles: ['change'] } as any);
    vi.mocked(graphRepository.getEdgeByNameAndVertices).mockResolvedValue(
      edge as any,
    );
    vi.mocked(persistenceUtil.testAccess).mockResolvedValue(true);

    const context = createContext();
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should fail when graph access is denied', async () => {
    const edge = {
      getPropAsArray: vi.fn().mockReturnValue(['role-a']),
    };
    vi.mocked(collectionRepository.getCollectionByKeyValue)
      .mockResolvedValueOnce({ vertex: 'project-vtx' } as any)
      .mockResolvedValueOnce({ vertex: 'service-vtx' } as any)
      .mockResolvedValueOnce({ changeRoles: ['change'] } as any);
    vi.mocked(graphRepository.getEdgeByNameAndVertices).mockResolvedValue(
      edge as any,
    );
    vi.mocked(persistenceUtil.testAccess).mockResolvedValue(false);

    const context = createContext();
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.key).toBe('user.id');
  });

  it('should return rule name', () => {
    expect(rule.getRuleName()).toBe('assisted-delivery-validation');
  });

  it('should return priority 80', () => {
    expect(rule.getPriority()).toBe(80);
  });
});
