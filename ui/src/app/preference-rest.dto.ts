// Shared DTO: Copy in back-end and front-end should be identical
export interface PreferenceRestDto {
  graphFollows: 'edge' | 'vertex';
  graphVertexFocus: string;
  graphVertexVisibility: { [key: string]: boolean };
  graphEdgeSrcTarVisibility: { [key: string]: boolean };
}
