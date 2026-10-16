// Shared DTO: Copy in back-end and front-end should be identical

import { IsArray, IsOptional } from 'class-validator';

export class CollectionBaseDto {
  @IsOptional()
  @IsArray()
  tags?: string[];
}

/**
 * Latest automated source to update a collection item. Null if only
 * manually managed.
 */
export type CollectionSource = 'catalog' | 'intention' | 'opensearch';

export type ProvenanceType = 'manual' | CollectionSource;

export interface VertexPointerDto {
  id: string;
  vertex: string;
  tags?: string[];
  source?: CollectionSource | null;
}
