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
  graphFollows: 'edge' | 'vertex' = 'vertex';

  public toRestDto(): PreferenceRestDto {
    return {
      graphFollows: this.graphFollows,
    };
  }
}
