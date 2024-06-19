import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import {
  CollectionEdgeConfig,
  CollectionEdgeInstanceConfig,
  CollectionFieldConfigMap,
  CollectionMap,
} from './collection-config-rest.dto';
import { EdgeDto } from './edge.dto';

@Entity({ name: 'collectionConfig' })
export class CollectionConfigDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  browseFields: string[];

  @Column()
  @Index()
  collection: string;

  @Column()
  collectionMapper: CollectionMap[];

  @Column()
  collectionVertexName: string;

  @Column()
  edges: CollectionEdgeConfig[];

  @Column()
  fields: CollectionFieldConfigMap;

  @Column()
  graphVertexOmit?: boolean;

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
    update: boolean;
    delete: boolean;
  };

  @Column()
  show: boolean;
}

export type CollectionConfigInstanceDto = Omit<CollectionConfigDto, 'edges'> & {
  edge: CollectionEdgeInstanceConfig;
  instance: EdgeDto;
};
