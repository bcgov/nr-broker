import { CollectionNames } from './collection-dto-union.type';

// Shared DTO: Copy in back-end and front-end should be identical
export interface PreferenceDto {
  browseCollectionDefault: CollectionNames;
  browseConnectionFilter: 'connected' | 'all';
  graphFollows: 'edge' | 'vertex';
  graphVertexVisibility?: { [key: string]: boolean };
  graphEdgeSrcTarVisibility?: { [key: string]: boolean };
  homeSectionTab: number;
  ignoreGitHubLink: boolean;
}
