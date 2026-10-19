// Shared DTO: Copy in back-end and front-end should be identical

/**
 * An automated source that can create or update a collection item.
 */
export type CollectionSource = 'catalog' | 'intention' | 'opensearch';

export type ProvenanceType = 'manual' | CollectionSource;

export class ProvenanceDto {
  type!: ProvenanceType;

  /**
   * Catalog only: SCM URL of the repository containing the catalog file
   */
  repository?: string;

  /**
   * Catalog only: path of the catalog file relative to the repository root
   */
  path?: string;

  createdAt!: string;

  updatedAt!: string;
}
