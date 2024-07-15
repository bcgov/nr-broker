// Shared DTO: Copy in back-end and front-end should be identical
export interface PreferenceRestDto {
  browseConnectionFilter: 'connected' | 'all';
  graphFollows: 'edge' | 'vertex';
  graphVertexVisibility: { [key: string]: boolean };
  graphEdgeSrcTarVisibility: { [key: string]: boolean };
}
