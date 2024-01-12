import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import {
  CollectionEdgePermissions,
  CollectionEdgeTarget,
} from './collection-edge-config-rest.dto';
import { CollectionFieldConfigMap } from './collection-config-rest.dto';

@Entity({ name: 'collectionEdgeConfigDto' })
export class CollectionEdgeConfigDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  @Index()
  collection: string;

  @Column()
  edge: CollectionEdgeTarget;

  @Column()
  permissions: CollectionEdgePermissions;

  @Column()
  property: CollectionFieldConfigMap;
}
