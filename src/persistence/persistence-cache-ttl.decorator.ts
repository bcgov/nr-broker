import { SetMetadata } from '@nestjs/common';
import { PERSISTENCE_CACHE_METADATA_TTL } from './persistence.constants';

export const PersistenceCacheTtl = (ttl: number) =>
  SetMetadata(PERSISTENCE_CACHE_METADATA_TTL, ttl);
