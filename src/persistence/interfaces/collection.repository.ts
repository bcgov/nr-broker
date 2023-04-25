import { CollectionConfigDto } from '../dto/collection-config.dto';

export abstract class CollectionRepository {
  public abstract getCollectionConfigs(): Promise<CollectionConfigDto[]>;

  public abstract getCollectionConfigByname(
    collection: string,
  ): Promise<CollectionConfigDto>;

  public abstract getCollectionByVertexId(
    type: string,
    id: string,
  ): Promise<any>;

  public abstract getCollectionByKeyValue(
    type: string,
    key: string,
    value: string,
  ): Promise<any>;
}
