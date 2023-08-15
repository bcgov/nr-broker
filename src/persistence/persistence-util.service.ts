import { Injectable } from '@nestjs/common';
import { JwtRegistryDto } from './dto/jwt-registry.dto';
import { CollectionRepository } from './interfaces/collection.repository';

@Injectable()
export class PersistenceUtilService {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  public async getAccount(registryJwt: JwtRegistryDto) {
    if (!registryJwt) {
      return null;
    }
    return this.collectionRepository.getCollectionById(
      'brokerAccount',
      registryJwt.accountId.toString(),
    );
  }
}
