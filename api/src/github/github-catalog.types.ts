export interface CatalogOrgScanJob {
  type: 'org';
  org: string;
}

export interface CatalogRepoScanJob {
  type: 'repo';
  org: string;
  repo: string;
  defaultBranch?: string;
  htmlUrl: string;
  description?: string;
  repositoryId?: string;
}

export type CatalogScanJob = CatalogOrgScanJob | CatalogRepoScanJob;
