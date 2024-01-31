// Shared DTO: Copy in back-end and front-end should be identical

export class GraphTypeaheadData {
  id!: string;
  collection!: string;
  name!: string;
  parentName?: string;
}

export class GraphTypeaheadResult {
  data!: GraphTypeaheadData[];
  meta!: {
    total: number;
  };
}
