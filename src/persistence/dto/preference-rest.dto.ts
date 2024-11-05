import { CollectionNames } from './collection-dto-union.type';

// Shared DTO: Copy in back-end and front-end should be identical
export interface PreferenceRestDto {
  browseConnectionFilter: 'connected' | 'all';
  browseCollectionDefault: CollectionNames;
  graphFollows: 'edge' | 'vertex';
  graphVertexVisibility: { [key: string]: boolean };
  graphEdgeSrcTarVisibility: { [key: string]: boolean };
  homeSectionTab: number;
  ignoreGitHubLink: boolean;
}
