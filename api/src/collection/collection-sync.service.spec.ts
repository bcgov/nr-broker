import { describe, expect, it, vi } from 'vitest';
import { CollectionSyncService } from './collection-sync.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { RedisService } from '../redis/redis.service';
import { GithubSyncService } from '../github/github-sync.service';
import { GraphService } from '../graph/graph.service';

describe('CollectionSyncService', () => {
  it('uses the traversed vertex id when resolving downstream sync targets', async () => {
    const collectionRepository = {
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
          return {
            syncQueues: [
              {
                queue: {
                  queue: 'GITHUB_SYNC_SECRETS',
                  queuedStatusProperty: 'syncSecretsStatus',
                },
              },
            ],
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
        async (_collection: string, id: string) => {
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

    const graphRepository = {
      getDownstreamVertex: vi.fn().mockResolvedValue([
        {
          collection: { id: 'source-collection-id', vertex: 'source-vertex-id' },
          vertex: { id: 'target-vertex-id' },
          edge: { id: 'edge-id' },
        },
      ]),
      getUpstreamVertex: vi.fn(),
    } as unknown as GraphRepository;

    const redisService = {
      queue: vi.fn(),
    } as unknown as RedisService;

    const githubSyncService = {
      isEnabled: vi.fn().mockReturnValue(true),
    } as unknown as GithubSyncService;

    const graphService = {
      updateSyncStatus: vi.fn(),
    } as unknown as GraphService;

    const service = new CollectionSyncService(
      collectionRepository,
      graphRepository,
      redisService,
      githubSyncService,
      graphService,
    );

    const targets = await service.refresh(
      'team',
      'source-collection-id',
      'GITHUB_SYNC_SECRETS',
      false,
    );

    expect(collectionRepository.getCollectionByVertexId).toHaveBeenCalledWith(
      'repository',
      'target-vertex-id',
    );
    expect(collectionRepository.getCollectionByVertexId).not.toHaveBeenCalledWith(
      'repository',
      'source-vertex-id',
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
