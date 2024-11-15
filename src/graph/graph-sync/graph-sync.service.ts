import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { first, get, mapEntries, shake } from 'radash';
import { v4 as uuidv4 } from 'uuid';

import { GraphService } from '../graph.service';
import { OpensearchService } from '../../aws/opensearch.service';
import { CollectionConfigEntity } from '../../persistence/dto/collection-config.entity';
import { CollectionDtoUnion } from '../../persistence/dto/collection-dto-union.type';
import { CollectionRepository } from '../../persistence/interfaces/collection.repository';
import { VertexInsertDto } from '../../persistence/dto/vertex-rest.dto';
import { DateUtil, INTERVAL_HOUR_MS } from '../../util/date.util';
import { IS_PRIMARY_NODE } from '../../constants';
import { CreateRequestContext } from '@mikro-orm/core';

@Injectable()
export class GraphSyncService {
  private readonly logger = new Logger(GraphSyncService.name);
  constructor(
    private readonly graphService: GraphService,
    private readonly opensearchService: OpensearchService,
    private readonly collectionRepository: CollectionRepository,
    private readonly dateUtil: DateUtil,
  ) {}

  @CreateRequestContext()
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runCollectionSync() {
    if (!IS_PRIMARY_NODE) {
      // Nodes that are not the primary one should not run sync
      return;
    }
    const configs = await this.collectionRepository.getCollectionConfigs();
    for (const config of configs) {
      try {
        await this.syncCollection(config);
      } catch (e) {
        this.logger.log(`Failed to sync collection: ${config.collection}`);
      }
    }
  }

  private async syncCollection(config: CollectionConfigEntity) {
    if (!config.sync) {
      return;
    }
    const now = Date.now();
    const index = this.dateUtil.computeIndex(
      config.sync.index,
      new Date(now - INTERVAL_HOUR_MS * 12),
      new Date(now),
    );
    const response = await this.opensearchService.search(index, {
      size: 0,
      aggs: {
        unique_field: {
          terms: {
            field: config.sync.unique,
            size: 10000,
          },
        },
      },
    });
    const result = JSON.parse(response.data);
    if (!result?.aggregations?.unique_field?.buckets) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No buckets found',
      });
    }
    const buckets = result.aggregations.unique_field.buckets;
    for (const { key } of buckets) {
      const bucketResponse = await this.opensearchService.search(index, {
        size: 1,
        query: {
          term: {
            [config.sync.unique]: {
              value: key,
            },
          },
        },
      });

      const bucketResult = JSON.parse(bucketResponse.data);

      if (
        !bucketResult?.hits?.hits ||
        !Array.isArray(bucketResult?.hits?.hits) ||
        bucketResult?.hits?.hits.length !== 1 ||
        !bucketResult?.hits?.hits[0]._source
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'No results',
        });
      }
      const doc = bucketResult.hits.hits[0]._source;

      const upsert: VertexInsertDto = {
        collection: config.collection as keyof CollectionDtoUnion,
        data: shake(
          this.initFields(
            config,
            mapEntries(config.sync.map, (src: string, info) => {
              if (info.type === 'first') {
                const val = get(doc, src);
                return [info.dest, Array.isArray(val) ? first(val) : val];
              } else if (info.type === 'pick') {
                const val = get<string | string[]>(doc, src);
                if (Array.isArray(val)) {
                  return [
                    info.dest,
                    val.find((arrVal) =>
                      info.endsWith.some((ending) => arrVal.endsWith(ending)),
                    ),
                  ];
                } else {
                  return [info.dest, val];
                }
              }
            }),
          ),
        ),
      };

      try {
        await this.graphService.upsertVertex(null, upsert, 'name', key);
      } catch (e) {
        this.logger.log(
          `Failed to sync ${config.collection}.${key} from ${index}. Check source for missing fields.`,
        );
        this.logger.log(upsert);
      }
    }
  }

  private initFields(config: CollectionConfigEntity, data: any) {
    for (const key of Object.keys(config.fields)) {
      const initVal = config.fields[key].init;
      if (initVal === 'now') {
        data[key] = new Date().toISOString();
      } else if (initVal === 'uuid') {
        data[key] = uuidv4();
      }
    }
    return data;
  }
}
