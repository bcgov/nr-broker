// Shared DTO: Copy in back-end and front-end should be identical
export interface PreferenceRestDto {
  graphFollows: 'edge' | 'vertex';
  graphVertexVisibility: { [key: string]: boolean };
  graphEdgeSrcTarVisibility: { [key: string]: boolean };
}
