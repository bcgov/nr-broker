import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { ApiHideProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PreferenceRestDto } from './preference-rest.dto';
import { CollectionNames } from './collection-dto-union.type';

@Entity({ tableName: 'preference' })
export class PreferenceEntity {
  @ApiHideProperty()
  @Transform((value) =>
    value.obj.id ? new ObjectId(value.obj.id.toString()) : null,
  )
  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index()
  guid: string;

  @Property()
  browseConnectionFilter: 'connected' | 'all';

  @Property()
  browseCollectionDefault: CollectionNames;

  @Property()
  graphFollows: 'edge' | 'vertex' = 'vertex';

  @Property()
  graphVertexVisibility: { [key: string]: boolean } = {};

  @Property()
  graphEdgeSrcTarVisibility: { [key: string]: boolean } = {};

  @Property()
  homeSectionTab: number;

  @Property()
  ignoreGitHubLink: boolean = false;

  public toRestDto(): PreferenceRestDto {
    return {
      browseConnectionFilter: this.browseConnectionFilter ?? 'connected',
      browseCollectionDefault: this.browseCollectionDefault ?? 'project',
      graphFollows: this.graphFollows,
      graphVertexVisibility: this.graphVertexVisibility,
      graphEdgeSrcTarVisibility: this.graphEdgeSrcTarVisibility,
      homeSectionTab: this.homeSectionTab ?? 0,
      ignoreGitHubLink: this.ignoreGitHubLink ?? false,
    };
  }
}
