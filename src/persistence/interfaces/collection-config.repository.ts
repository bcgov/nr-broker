import { CollectionConfigDto } from '../dto/collection-config.dto';

export abstract class CollectionConfigRepository {
  public abstract getAll(): Promise<CollectionConfigDto[]>;

  public abstract getCollectionConfigByname(
    collection: string,
  ): Promise<CollectionConfigDto>;
}
