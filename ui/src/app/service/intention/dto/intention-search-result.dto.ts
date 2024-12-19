// Shared DTO: Copy in back-end and front-end should be identical

export class IntentionSearchResult {
  data!: any[];
  meta!: {
    total: number;
  };
}
