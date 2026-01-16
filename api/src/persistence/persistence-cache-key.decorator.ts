import { SetMetadata } from '@nestjs/common';
import { PERSISTENCE_CACHE_METADATA_KEY } from './persistence.constants';

export const PersistenceCacheKey = (key: string) =>
  SetMetadata(PERSISTENCE_CACHE_METADATA_KEY, key);
