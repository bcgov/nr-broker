import type { CatalogComponent } from './catalog-component';
import type { CatalogSystem } from './catalog-system';

/**
 * A source code repository that declares catalog entities.
 */
export interface CatalogRepository {
  name: string;
  scmUrl: string;
  description: string;
  tags?: string[];
}
export interface CatalogSnapshot {
  entities: (CatalogComponent | CatalogSystem)[];
  complete: boolean;
}
