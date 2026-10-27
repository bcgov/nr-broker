// Shared DTO: Copy in back-end and front-end should be identical

export enum ProvenanceType {
  MANUAL = 'manual',
  CATALOG = 'catalog',
  INTENTION = 'intention',
  OPENSEARCH = 'opensearch',
}

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
