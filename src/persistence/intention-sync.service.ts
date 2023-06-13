import { Injectable } from '@nestjs/common';
import { IntentionDto } from '../intention/dto/intention.dto';
import { CollectionRepository } from './interfaces/collection.repository';
import { GraphRepository } from './interfaces/graph.repository';

@Injectable()
export class IntentionSyncService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
  ) {}

  public async sync(intention: IntentionDto) {
    await this.syncProjects(intention);
    await this.syncServices(intention);
    await this.syncProjectServiceEdge(intention);
  }

  private async syncProjects(intention: IntentionDto) {
    for (const action of intention.actions) {
      const project = await this.collectionRepository.getCollectionByKeyValue(
        'project',
        'name',
        action.service.project,
      );
      if (!project) {
        await this.graphRepository.addVertex(
          {
            collection: 'project',
            data: {
              name: action.service.project,
              key: action.service.project,
              configuration: '{}',
            },
          },
          true,
        );
      }
    }
  }

  private async syncServices(intention: IntentionDto) {
    for (const action of intention.actions) {
      const service = await this.collectionRepository.getCollectionByKeyValue(
        'service',
        'name',
        action.service.name,
      );
      if (!service) {
        await this.graphRepository.addVertex(
          {
            collection: 'service',
            data: {
              name: action.service.name,
              configuration: '{}',
            },
          },
          true,
        );
      }
    }
  }

  private async syncProjectServiceEdge(intention: IntentionDto) {
    for (const action of intention.actions) {
      const project = await this.collectionRepository.getCollectionByKeyValue(
        'project',
        'name',
        action.service.project,
      );
      const service = await this.collectionRepository.getCollectionByKeyValue(
        'service',
        'name',
        action.service.name,
      );
      if (project && service) {
        try {
          await this.graphRepository.addEdge({
            name: 'component',
            source: project.vertex.toString(),
            target: service.vertex.toString(),
          });
        } catch (e) {}
      }
    }
  }
}
