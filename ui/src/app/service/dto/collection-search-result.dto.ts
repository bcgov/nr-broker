// Shared DTO: Copy in back-end and front-end should be identical

export class CollectionSearchConnections {
  upstream_edge: any;
  upstream: any;
  downstream_edge: any;
  downstream: any;
}

export type CollectionData<T> = T & CollectionSearchConnections;

export class CollectionSearchResult<T> {
  data!: CollectionData<T>[];
  meta!: {
    total: number;
  };
}
