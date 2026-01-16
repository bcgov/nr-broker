import { CollectionNames } from './collection-dto-union.type';

// Shared DTO: Copy in back-end and front-end should be identical
export interface PreferenceDto {
  browseCollectionDefault: CollectionNames;
  browseConnectionFilter: 'connected' | 'all';
  browseConnectionSize: number;
  graphFollows: 'edge' | 'vertex';
  graphHideRestricted: boolean;
  graphVertexVisibility?: Record<string, boolean>;
  graphEdgeSrcTarVisibility?: Record<string, boolean>;
  homeSectionTab: number;
  ignoreGitHubLink: boolean;
}
