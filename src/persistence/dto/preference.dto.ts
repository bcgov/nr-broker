import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import { PreferenceRestDto } from './preference-rest.dto';
import { CollectionNames } from './collection-dto-union.type';

@Entity({ name: 'preference' })
export class PreferenceDto {
  @ObjectIdColumn()
  @ApiProperty({ type: () => String })
  id: ObjectId;

  @Column()
  @Index()
  guid: string;

  @Column()
  browseConnectionFilter: 'connected' | 'all';

  @Column()
  browseCollectionDefault: CollectionNames;

  @Column()
  graphFollows: 'edge' | 'vertex' = 'vertex';

  @Column()
  graphVertexVisibility: { [key: string]: boolean } = {};

  @Column()
  graphEdgeSrcTarVisibility: { [key: string]: boolean } = {};

  @Column()
  homeSectionTab: number;

  public toRestDto(): PreferenceRestDto {
    return {
      browseConnectionFilter: this.browseConnectionFilter ?? 'connected',
      browseCollectionDefault: this.browseCollectionDefault ?? 'project',
      graphFollows: this.graphFollows,
      graphVertexVisibility: this.graphVertexVisibility,
      graphEdgeSrcTarVisibility: this.graphEdgeSrcTarVisibility,
      homeSectionTab: this.homeSectionTab ?? 0,
    };
  }
}
