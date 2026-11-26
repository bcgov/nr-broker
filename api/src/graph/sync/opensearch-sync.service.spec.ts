import { beforeEach, describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OpensearchSyncService } from './opensearch-sync.service';
import { CollectionConfigEntity } from '../../persistence/entity/collection-config.entity';
import { CollectionNameStringEnum } from '../../persistence/entity/collection-entity-union.type';

describe('OpensearchSyncService', () => {
  let service: OpensearchSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpensearchSyncService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<OpensearchSyncService>(OpensearchSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs the ownership reason when an OpenSearch update is denied', async () => {
    const graphService = createMock<import('../graph.service').GraphService>();
    const opensearchService = createMock<import('../../aws/opensearch.service').OpensearchService>();
    const dateUtil = createMock<import('../../util/date.util').DateUtil>();
    dateUtil.computeIndex.mockReturnValue('index');
    opensearchService.search
      .mockResolvedValueOnce({ data: JSON.stringify({ aggregations: { unique_field: { buckets: [{ key: 'api' }] } } }) })
      .mockResolvedValueOnce({ data: JSON.stringify({ hits: { hits: [{ _source: { name: 'api' } }] } }) });
    graphService.upsertVertex.mockRejectedValue(new ForbiddenException({
      message: 'Update denied',
      error: 'This item is managed by a catalog file.',
    }));
    const sync = new OpensearchSyncService(
      graphService, opensearchService, createMock(), dateUtil, createMock(), createMock(),
    );
    const log = vi.spyOn(sync['logger'], 'log').mockImplementation(() => undefined);
    const config = createMock<CollectionConfigEntity>({
      collection: CollectionNameStringEnum.service,
      fields: {},
      sync: { index: 'index', unique: 'name', map: { name: { type: 'first', dest: 'name' } } },
    });

    await sync['syncCollection'](config);

    expect(log).toHaveBeenCalledWith(
      'Failed to sync service.api from index: This item is managed by a catalog file.',
    );
  });
});
