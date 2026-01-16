import { Injectable } from '@nestjs/common';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionIndex } from '../graph/graph.constants';
import { RepositoryDto } from '../persistence/dto/repository.dto';
import { GithubSyncService } from '../github/github-sync.service';

@Injectable()
export class TeamCollectionService {
  constructor(
    private readonly githubSyncService: GithubSyncService,
    private readonly graphRepository: GraphRepository,
  ) {}

  async refresh(id: string, syncSecrets: boolean, syncUsers: boolean) {
    const repositories =
      await this.graphRepository.getDownstreamVertex<RepositoryDto>(
        id,
        CollectionIndex.Repository,
        8,
      );
    for (const repository of repositories) {
      await this.githubSyncService.refresh(
        repository.collection,
        syncSecrets,
        syncUsers,
      );
    }
  }
}
