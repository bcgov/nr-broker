import { EdgeDto } from './edge.dto';
import {
  GraphDataResponseVertexEntity,
  GraphDeleteResponseDto,
} from './graph-data.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export type GraphEventDto =
  | GraphCollectionEventDto
  | GraphEdgeEventDto
  | GraphVertexEventDto
  | GraphDeleteEventDto;

export class GraphCollectionEventDto {
  event!: 'collection-edit';
  collection!: { id: string; vertex: string };
}

export class GraphEdgeEventDto {
  event!: 'edge-add' | 'edge-edit';
  edge!: EdgeDto;
}

export class GraphVertexEventDto {
  event!: 'vertex-add' | 'vertex-edit';
  vertex!: GraphDataResponseVertexEntity;
}

export class GraphDeleteEventDto extends GraphDeleteResponseDto {
  event!: 'edge-delete' | 'vertex-delete';
}
