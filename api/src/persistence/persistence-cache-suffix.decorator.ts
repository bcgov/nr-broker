import { SetMetadata } from '@nestjs/common';
import { PERSISTENCE_CACHE_METADATA_SUFFIX } from './persistence.constants';

export const PersistenceCacheSuffix = (suffix: any) =>
  SetMetadata(PERSISTENCE_CACHE_METADATA_SUFFIX, suffix);
