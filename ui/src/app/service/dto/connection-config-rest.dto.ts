// Shared DTO: Copy in back-end and front-end should be identical

export class ConnectionConfigRestDto {
  id!: string;
  collection!: string;
  description!: string;
  href!: string;
  name!: string;
  order!: number;
}
