// Shared DTO: Copy in back-end and front-end should be identical

import { IsArray, IsOptional } from 'class-validator';

export class CollectionBaseDto {
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export interface VertexPointerDto {
  id: string;
  vertex: string;
  tags?: string[];
}
