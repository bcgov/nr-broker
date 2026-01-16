import { SetMetadata } from '@nestjs/common';

export const ALLOW_EMPTY_EDGE_METADATA_KEY = 'allow-empty-edge';
export const AllowEmptyEdges = (...args: string[]) =>
  SetMetadata(ALLOW_EMPTY_EDGE_METADATA_KEY, args);
