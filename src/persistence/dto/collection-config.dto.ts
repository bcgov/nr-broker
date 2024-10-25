import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import {
  CollectionEdgeConfig,
  CollectionEdgeInstanceConfig,
  CollectionFieldConfigMap,
  CollectionMap,
  CollectionSyncConfig,
} from './collection-config-rest.dto';
import { EdgeDto } from './edge.dto';
import { CollectionDtoUnion } from './collection-dto-union.type';

@Entity({ name: 'collectionConfig' })
export class CollectionConfigDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  browseFields: string[];

  @Column()
  @Index()
  @ApiProperty({ type: () => String })
  collection: keyof CollectionDtoUnion;

  @Column()
  collectionMapper: CollectionMap[];

  @Column()
  collectionVertexName: string;

  @Column()
  color: string;

  @Column()
  edges: CollectionEdgeConfig[];

  @Column()
  fields: CollectionFieldConfigMap;

  @Column()
  fieldDefaultSort: {
    field: string;
    dir: 1 | -1;
  };

  @Column()
  hint: string;

  @Column()
  index: number;

  @Column()
  name: string;

  @Column()
  ownableCollections?: string[];

  @Column()
  parent: {
    edgeName: string;
  };

  @Column()
  permissions: {
    browse: boolean;
    create: boolean;
    filter: boolean;
    update: boolean;
    delete: boolean;
  };

  @Column()
  show: boolean;

  @Column()
  sync?: CollectionSyncConfig;
}

export type CollectionConfigInstanceDto = Omit<CollectionConfigDto, 'edges'> & {
  edge: CollectionEdgeInstanceConfig;
  instance: EdgeDto;
};
