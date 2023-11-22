// Shared DTO: Copy in back-end and front-end should be identical

export class CollectionSearchConnections {
  upstream_edge: any;
  upstream: any;
  downstream_edge: any;
  downstream: any;
}

export class CollectionSearchResult<T> {
  data!: (T & CollectionSearchConnections)[];
  meta!: {
    total: number;
  };
}
