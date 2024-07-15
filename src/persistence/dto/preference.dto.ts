import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ObjectId, ObjectIdColumn } from 'typeorm';
import { PreferenceRestDto } from './preference-rest.dto';

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
  graphFollows: 'edge' | 'vertex' = 'vertex';

  @Column()
  graphVertexVisibility: { [key: string]: boolean } = {};

  @Column()
  graphEdgeSrcTarVisibility: { [key: string]: boolean } = {};

  public toRestDto(): PreferenceRestDto {
    return {
      browseConnectionFilter: this.browseConnectionFilter ?? 'connected',
      graphFollows: this.graphFollows,
      graphVertexVisibility: this.graphVertexVisibility,
      graphEdgeSrcTarVisibility: this.graphEdgeSrcTarVisibility,
    };
  }
}
