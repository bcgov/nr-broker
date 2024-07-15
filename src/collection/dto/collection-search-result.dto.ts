// Shared DTO: Copy in back-end and front-end should be identical

export class CollectionSearchResult<T> {
  data!: T[];
  meta!: {
    total: number;
  };
}
