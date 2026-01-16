import { Injectable } from '@nestjs/common';
import { RepositoryDto } from '../persistence/dto/repository.dto';
import { GithubSyncService } from '../github/github-sync.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';

@Injectable()
export class RepositoryCollectionService {
  constructor(
    private readonly githubSyncService: GithubSyncService,
    private readonly collectionRepository: CollectionRepository,
  ) {}

  async refresh(id: string, syncSecrets: boolean, syncUsers: boolean) {
    const repository = await this.collectionRepository.getCollectionById(
      'repository',
      id,
    );
    await this.githubSyncService.refresh(
      repository as unknown as RepositoryDto,
      syncSecrets,
      syncUsers,
    );
  }
}
