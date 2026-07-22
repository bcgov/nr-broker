import { Injectable } from '@nestjs/common';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { KubernetesSyncService } from '../kubernetes/kubernetes-sync.service';

@Injectable()
export class CloudCollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly kubernetesSyncService: KubernetesSyncService,
  ) {}

  async refresh(id: string): Promise<void> {
    const cloud = await this.collectionRepository.getCollectionById('cloud', id);
    if (!cloud) {
      return;
    }
    await this.kubernetesSyncService.refreshByCloud(cloud.vertex.toString());
  }
}
