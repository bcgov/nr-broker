import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CollectionSyncService } from './collection-sync.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { RedisService } from '../redis/redis.service';
import { GithubSyncService } from '../github/github-sync.service';
import { GraphService } from '../graph/graph.service';

describe('CollectionSyncService', () => {
  let service: CollectionSyncService;
  let collectionRepository: any;
  let graphRepository: any;
  let redisService: any;
  let githubSyncService: any;
  let graphService: any;

  beforeEach(async () => {
    collectionRepository = {
      getCollectionConfigByName: vi.fn().mockImplementation(async (collection: string) => {
        if (collection === 'team') {
          return {
            syncQueues: [
              {
                traverse: {
                  collection: 'repository',
                  direction: 'downstream',
                  maxDepth: 8,
                  queues: ['GITHUB_SYNC_SECRETS'],
                },
              },
            ],
          };
        }

        if (collection === 'repository') {
          const rule = {
            queue: {
              queue: 'GITHUB_SYNC_SECRETS',
              queuedStatusProperty: 'syncSecretsStatus',
            },
          };
          return {
            syncQueues: [rule],
          };
        }

        return { syncQueues: [] };
      }),
      getSyncQueueConfigByQueue: vi.fn().mockResolvedValue({
        queue: 'GITHUB_SYNC_SECRETS',
        label: 'Secrets',
        description: 'sync repository secrets',
      }),
      getCollectionById: vi.fn().mockImplementation(
        async (collection: string, id: string) => {
          if (id === 'target-collection-id') {
            return {
              id: 'target-collection-id',
              vertex: 'target-vertex-id',
            };
          }

          return {
            id: 'source-collection-id',
            vertex: 'source-vertex-id',
          };
        },
      ),
      getCollectionByVertexId: vi.fn().mockImplementation(
        async (_collection: string, vertexId: string) => {
          if (vertexId === 'target-vertex-id') {
            return {
              id: 'target-collection-id',
              vertex: 'target-vertex-id',
            };
          }

          return null;
        },
      ),
    } as unknown as CollectionRepository;

    graphRepository = {
      getDownstreamVertex: vi.fn().mockResolvedValue([
        {
          id: 'target-vertex-id',
          collection: { id: 'target-collection-id', vertex: 'target-vertex-id' },
          edge: 'edge-id',
        },
      ]),
      getUpstreamVertex: vi.fn(),
    } as unknown as GraphRepository;

    redisService = {
      queue: vi.fn(),
    } as unknown as RedisService;

    githubSyncService = {
      isEnabled: vi.fn().mockReturnValue(true),
    } as unknown as GithubSyncService;

    graphService = {
      updateSyncStatus: vi.fn(),
    } as unknown as GraphService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionSyncService,
        { provide: CollectionRepository, useValue: collectionRepository },
        { provide: GraphRepository, useValue: graphRepository },
        { provide: RedisService, useValue: redisService },
        { provide: GithubSyncService, useValue: githubSyncService },
        { provide: GraphService, useValue: graphService },
      ],
    }).compile();

    service = module.get<CollectionSyncService>(CollectionSyncService);
  });

  it('uses the traversed vertex id when resolving downstream sync targets', async () => {
    const targets = await service.refresh(
      'team',
      'source-collection-id',
      'GITHUB_SYNC_SECRETS',
      false,
    );

    expect(graphService.updateSyncStatus).toHaveBeenCalledWith(
      {
        id: 'target-collection-id',
        vertex: 'target-vertex-id',
      },
      'syncSecretsStatus',
      'queuedAt',
    );
    expect(redisService.queue).toHaveBeenCalledWith(
      'github-sync-secrets',
      'target-collection-id',
    );
    expect(targets).toBeUndefined();
  });
});
