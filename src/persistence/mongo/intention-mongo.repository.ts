import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, MongoRepository } from 'typeorm';
import { ActionDto } from '../../intention/dto/action.dto';
import { IntentionDto } from '../../intention/dto/intention.dto';
import { IntentionRepository } from '../interfaces/intention.repository';
import { extractId } from './mongo.util';
import { IntentionSearchResult } from '../../intention/dto/intention-search-result.dto';
import { ObjectId } from 'mongodb';
import { ArtifactDto } from 'src/intention/dto/artifact.dto';
import { ArtifactSearchResult } from 'src/intention/dto/artifact-search-result.dto';

@Injectable()
export class IntentionMongoRepository implements IntentionRepository {
  constructor(
    @InjectRepository(IntentionDto)
    private readonly intentionRepository: MongoRepository<IntentionDto>,
  ) {}

  public async addIntention(intention: IntentionDto): Promise<any> {
    return await this.intentionRepository.save(intention);
  }

  public async findAllIntention(): Promise<IntentionDto[]> {
    return this.intentionRepository.find({
      where: { closed: { $ne: true } },
    });
  }

  public async findExpiredIntentions(): Promise<IntentionDto[]> {
    const currentTime = new Date().valueOf();
    return this.intentionRepository.find({
      where: { expiry: { $lt: currentTime }, closed: { $ne: true } } as any,
    });
  }

  public async getIntentionByToken(
    token: string,
  ): Promise<IntentionDto | null> {
    return await this.intentionRepository.findOne({
      where: { 'transaction.token': token, closed: { $ne: true } } as any,
    });
  }

  public async getIntentionByActionToken(
    token: string,
  ): Promise<IntentionDto | null> {
    return await this.intentionRepository.findOne({
      where: { 'actions.trace.token': token, closed: { $ne: true } } as any,
    });
  }

  public async getIntentionActionByToken(
    token: string,
  ): Promise<ActionDto | null> {
    const action = await this.intentionRepository
      .findOne({
        where: { 'actions.trace.token': token, closed: { $ne: true } } as any,
      })
      // project the matching ActionDto
      .then((intention) =>
        intention
          ? intention.actions.find((action) => action.trace.token === token)
          : null,
      );
    return action;
  }

  public async setIntentionActionLifecycle(
    token: string,
    outcome: string | undefined,
    type: 'start' | 'end',
  ): Promise<ActionDto> {
    const intention = await this.intentionRepository.findOne({
      where: { 'actions.trace.token': token, closed: { $ne: true } } as any,
    });
    if (intention === null) {
      throw new Error();
    }

    const action = intention.actions
      .filter((action) => action.trace.token === token)
      // There will only ever be one
      .find(() => true);

    if (action) {
      const currentTime = new Date().toISOString();
      action.lifecycle = type === 'start' ? 'started' : 'ended';
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
    const id = extractId(intention);
    await this.intentionRepository.replaceOne({ _id: id }, intention);
    return action;
  }

  public async addIntentionActionArtifact(
    token: string,
    artifact: ArtifactDto,
  ): Promise<ActionDto> {
    const intention = await this.intentionRepository.findOne({
      where: { 'actions.trace.token': token, closed: { $ne: true } } as any,
    });
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

    const id = extractId(intention);
    await this.intentionRepository.replaceOne({ _id: id }, intention);
    return action;
  }

  public async closeIntentionByToken(token: string): Promise<boolean> {
    const intention = await this.getIntentionByToken(token);
    return this.closeIntention(intention);
  }

  public async closeIntention(intention: IntentionDto): Promise<boolean> {
    if (intention) {
      intention.closed = true;
      const id = extractId(intention);
      const result = await this.intentionRepository.replaceOne(
        { _id: id },
        intention,
      );
      return result.modifiedCount === 1;
    }
    return false;
  }

  public async searchIntentions(
    where: FindOptionsWhere<IntentionDto> | FindOptionsWhere<IntentionDto>[],
    offset: number,
    limit: number,
  ): Promise<IntentionSearchResult> {
    if (where['_id']) {
      where['_id'] = new ObjectId(where['_id']);
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
              {
                $unset: [
                  'actions.transaction',
                  'actions.trace.token',
                  'transaction.token',
                ],
              },
            ],
            meta: [{ $count: 'total' }],
          },
        },
        { $unwind: '$meta' },
      ])
      .toArray()
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

  public async searchArtifacts(
    packageGuid: string | null,
    artifactChecksum: string | null,
    artifactName: string | null,
    artifactType: string | null,
    service: string | null,
    offset: number,
    limit: number,
  ): Promise<ArtifactSearchResult> {
    const result = await this.searchIntentions(
      {
        'actions.artifacts': { $exists: true },
        ...(service ? { 'actions.service.name': service } : {}),
        ...(packageGuid ? { 'actions.package.buildGuid': packageGuid } : {}),
        ...(artifactChecksum
          ? { 'actions.artifacts.checksum': artifactChecksum }
          : {}),
        ...(artifactName ? { 'actions.artifacts.name': artifactName } : {}),
        ...(artifactType ? { 'actions.artifacts.type': artifactType } : {}),
      } as FindOptionsWhere<IntentionDto>,
      offset,
      limit,
    );

    return {
      artifacts: result.data
        .map((intention) => {
          return this.findArtifacts(
            intention,
            artifactChecksum,
            artifactName,
            artifactType,
          );
        })
        .reduce((pv, cv) => pv.concat(cv), []),
      ...result,
    };
  }

  private findArtifacts(
    intention: IntentionDto | null,
    artifactChecksum: string | null,
    artifactName: string | null,
    artifactType: string | null,
  ): { action: ActionDto; artifact: ArtifactDto }[] {
    for (const action of intention.actions) {
      if (!action.artifacts) {
        return;
      }
      const artifacts = action.artifacts.filter(
        (artifact) =>
          (!artifactChecksum || artifact.checksum === artifactChecksum) &&
          (!artifactName || artifact.name === artifactName) &&
          (!artifactType || artifact.type === artifactType),
      );
      return artifacts.map((artifact) => ({ action, artifact }));
    }
  }
}
