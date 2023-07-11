import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import {
  CollectionEdgeConfig,
  CollectionFieldConfigMap,
  CollectionMap,
} from './collection-config-rest.dto';

@Entity({ name: 'collectionConfig' })
export class CollectionConfigDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

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
  index: number;

  @Column()
  name: string;

  @Column()
  parent: {
    edgeName: string;
  };

  @Column()
  permissions: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };

  @Column()
  show: boolean;
}
