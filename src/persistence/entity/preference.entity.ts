import {
  BaseEntity,
  Entity,
  Enum,
  Index,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from 'mongodb';
import { PreferenceDto } from '../dto/preference.dto';
import { CollectionNames } from '../dto/collection-dto-union.type';
import { CollectionNameStringEnum } from './collection-entity-union.type';

@Entity({ tableName: 'preference' })
export class PreferenceEntity extends BaseEntity {
  constructor(guid: string) {
    super();
    this.guid = guid;
  }

  public setFromDto(preference: PreferenceDto): void {
    this.browseCollectionDefault = preference.browseCollectionDefault;
    this.browseConnectionFilter = preference.browseConnectionFilter;
    this.graphFollows = preference.graphFollows;
    this.graphVertexVisibility = preference.graphVertexVisibility;
    this.graphEdgeSrcTarVisibility = preference.graphEdgeSrcTarVisibility;
    this.homeSectionTab = preference.homeSectionTab;
    this.ignoreGitHubLink = preference.ignoreGitHubLink;
  }

  @PrimaryKey()
  @Property()
  _id: ObjectId;

  @SerializedPrimaryKey()
  id!: string; // won't be saved in the database

  @Property()
  @Index()
  guid: string;

  @Property()
  browseConnectionFilter: 'connected' | 'all' = 'connected';

  @Enum(() => CollectionNameStringEnum)
  browseCollectionDefault: CollectionNames = 'project';

  @Property()
  graphFollows: 'edge' | 'vertex' = 'vertex';

  @Property({
    type: 'json',
    nullable: true,
  })
  graphVertexVisibility?: { [key: string]: boolean } = {};

  @Property({
    type: 'json',
    nullable: true,
  })
  @Property()
  graphEdgeSrcTarVisibility?: { [key: string]: boolean } = {};

  @Property()
  homeSectionTab: number = 0;

  @Property()
  ignoreGitHubLink: boolean = false;

  // public toRestDto(): PreferenceDto {
  //   return {
  //     browseConnectionFilter: this.browseConnectionFilter ?? 'connected',
  //     browseCollectionDefault: this.browseCollectionDefault ?? 'project',
  //     graphFollows: this.graphFollows,
  //     graphVertexVisibility: this.graphVertexVisibility,
  //     graphEdgeSrcTarVisibility: this.graphEdgeSrcTarVisibility,
  //     homeSectionTab: this.homeSectionTab ?? 0,
  //     ignoreGitHubLink: this.ignoreGitHubLink ?? false,
  //   };
  // }
}
