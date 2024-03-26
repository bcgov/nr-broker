import {
  GraphDataResponseEdgeDto,
  GraphDataResponseVertexDto,
  GraphDeleteResponseDto,
} from './graph-data.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export type GraphEventRestDto =
  | GraphEdgeEventRestDto
  | GraphVertexEventRestDto
  | GraphDeleteEventRestDto;

export class GraphEdgeEventRestDto {
  event!: 'edge-add' | 'edge-edit';
  edge!: GraphDataResponseEdgeDto;
}

export class GraphVertexEventRestDto {
  event!: 'vertex-add' | 'vertex-edit';
  vertex!: GraphDataResponseVertexDto;
}

export class GraphDeleteEventRestDto extends GraphDeleteResponseDto {
  event!: 'edge-delete' | 'vertex-delete';
}
