import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectId, ObjectIdColumn } from 'typeorm';

interface CollectionEdgeConfig {
  collection: string;
  name: string;
  onDelete?: 'cascade';
  relation: 'oneToMany' | 'oneToOne';
  inboundName?: string;
  namePath?: string;
}

interface CollectionFieldConfig {
  type: 'string' | 'json';
}

export class CollectionMap {
  getPath: string;
  setPath: string;
}

@Entity({ name: 'collectionConfig' })
export class CollectionConfigDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  collection: string;

  @Column()
  collectionMapper: CollectionMap[];

  @Column()
  edges: CollectionEdgeConfig[];

  @Column()
  fields: {
    [key: string]: CollectionFieldConfig;
  };

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
}
