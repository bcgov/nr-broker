import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { MongoEntityRepository } from '@mikro-orm/mongodb';
import { EntityManager } from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

import { LIFECYCLE_NAMES } from '../../intention/dto/action.dto';
import { IntentionEntity } from '../../intention/entity/intention.entity';
import { IntentionRepository } from '../interfaces/intention.repository';
import { IntentionSearchResult } from '../../intention/dto/intention-search-result.dto';
import { ActionEmbeddable } from '../../intention/entity/action.embeddable';
import { ArtifactEmbeddable } from '../../intention/entity/artifact.embeddable';

@Injectable()
export class IntentionMongoRepository implements IntentionRepository {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(IntentionEntity)
    private readonly intentionRepository: MongoEntityRepository<IntentionEntity>,
  ) {}

  public async addIntention(intention: IntentionEntity): Promise<void> {
    await this.em.persist(intention).flush();
  }

  public async getIntention(
    id: string | ObjectId,
  ): Promise<IntentionEntity | null> {
    return this.intentionRepository.findOne({ _id: new ObjectId(id) });
  }

  public async findAllIntention(): Promise<IntentionEntity[]> {
    return this.intentionRepository.find({ closed: { $ne: true } });
  }

  public async findExpiredIntentions(): Promise<IntentionEntity[]> {
    const currentTime = new Date().valueOf();
    return this.intentionRepository.find({
      expiry: { $lt: currentTime },
      closed: { $ne: true },
    });
  }

  public async getIntentionByToken(
    token: string,
  ): Promise<IntentionEntity | null> {
    return await this.intentionRepository.findOne({
      'transaction.token': token,
      closed: { $ne: true },
    } as any);
  }

  public async getIntentionByActionToken(
    token: string,
  ): Promise<IntentionEntity | null> {
    return await this.intentionRepository.findOne({
      'actions.trace.token': token,
      closed: { $ne: true },
    } as any);
  }

  public async getIntentionActionByToken(
    token: string,
  ): Promise<ActionEmbeddable | null> {
    const action = await this.intentionRepository
      .findOne({ 'actions.trace.token': token, closed: { $ne: true } } as any)
      // project the matching ActionDto
      .then((intention) =>
        intention
          ? intention.actions.find((action) => action.trace.token === token)
          : null,
      );
    return action;
  }

  public async setIntentionActionLifecycle(
    intention: IntentionEntity,
    action: ActionEmbeddable,
    outcome: string | undefined,
    type: 'start' | 'end',
  ): Promise<boolean> {
    if (intention.closed) {
      throw new Error();
    }

    if (action) {
      const currentTime = new Date().toISOString();
      action.lifecycle =
        type === 'start' ? LIFECYCLE_NAMES.STARTED : LIFECYCLE_NAMES.ENDED;
      if (action.lifecycle === 'started') {
        action.trace.start = currentTime;
      }
      if (action.lifecycle === 'ended') {
        action.trace.end = currentTime;
        action.trace.outcome = outcome;
      }
      if (action.trace.start && action.trace.end) {
        action.trace.duration =
          Date.parse(action.trace.end).valueOf() -
          Date.parse(action.trace.start).valueOf();
      }
    }
    this.em.persist(intention).flush();
    return true;
  }

  public async addIntentionActionArtifact(
    token: string,
    artifact: ArtifactEmbeddable,
  ): Promise<ActionEmbeddable> {
    const intention = await this.intentionRepository.findOne({
      'actions.trace.token': token,
      closed: { $ne: true },
    } as any);
    if (intention === null) {
      throw new Error();
    }

    const action = intention.actions
      .filter((action) => action.trace.token === token)
      // There will only ever be one
      .find(() => true);

    if (action.artifacts) {
      action.artifacts.push(artifact);
    } else {
      action.artifacts = [artifact];
    }
    this.em.persist(intention).flush();
    return action;
  }

  public async closeIntentionByToken(token: string): Promise<boolean> {
    const intention = await this.getIntentionByToken(token);
    return this.closeIntention(intention);
  }

  public async closeIntention(intention: IntentionEntity): Promise<boolean> {
    if (intention) {
      intention.closed = true;
      await this.em.persist(intention).flush();
      return true;
    }
    return false;
  }

  public async searchIntentions(
    where: any,
    // | FindOptionsWhere<IntentionEntity>
    // | FindOptionsWhere<IntentionEntity>[],
    offset: number,
    limit: number,
  ): Promise<IntentionSearchResult> {
    if (where['_id'] && typeof where['_id'] === 'string') {
      where['_id'] = new ObjectId(where['_id']);
    }
    if (where['accountId'] && typeof where['accountId'] === 'string') {
      where['accountId'] = new ObjectId(where['accountId']);
    }
    if (
      where['actions.service.id'] &&
      typeof where['actions.service.id'] === 'string'
    ) {
      where['actions.service.id'] = new ObjectId(where['actions.service.id']);
    }
    return this.intentionRepository
      .aggregate([
        { $match: where },
        {
          $facet: {
            data: [
              { $sort: { 'transaction.start': -1 } },
              { $skip: offset },
              { $limit: limit },
              { $addFields: { id: '$_id' } },
              {
                $unset: [
                  'actions.transaction',
                  'actions.trace.token',
                  'transaction.token',
                  '_id',
                ],
              },
            ],
            meta: [{ $count: 'total' }],
          },
        },
        { $unwind: '$meta' },
      ])
      .then((array) => {
        if (array[0]) {
          return array[0] as unknown as IntentionSearchResult;
        } else {
          return {
            data: [],
            meta: { total: 0 },
          };
        }
      });
  }

  public async setActionPackageBuildRef(
    id: ObjectId,
    actionId: string,
    packageId: ObjectId,
  ): Promise<void> {
    await this.intentionRepository.getCollection().updateOne(
      { _id: id, 'actions.id': actionId },
      {
        $set: {
          'actions.$.package.id': packageId,
        },
      },
    );
  }

  public async cleanupTransient(transientTtl: number): Promise<void> {
    this.intentionRepository.getCollection().deleteMany({
      'event.transient': true,
      closed: true,
      expiry: { $lt: Date.now() - transientTtl },
    });
  }

  public async cleanupRejected(rejectedTtl: number): Promise<void> {
    this.intentionRepository.getCollection().deleteMany({
      'event.outcome': 'rejected',
      closed: true,
      expiry: { $lt: Date.now() - rejectedTtl },
    });
  }
}
