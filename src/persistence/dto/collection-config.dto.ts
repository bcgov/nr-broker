import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

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
  id: ObjectID;

  @Column()
  collection: string;

  @Column()
  index: number;

  @Column()
  edges: CollectionEdgeConfig[];

  @Column()
  fields: {
    [key: string]: CollectionFieldConfig;
  };

  @Column()
  name: string;

  @Column()
  collectionMapper: CollectionMap[];
}
