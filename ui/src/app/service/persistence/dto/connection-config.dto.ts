// Shared DTO: Copy in back-end and front-end should be identical

export class ConnectionConfigDto {
  id!: string;
  collection!: string;
  description!: string;
  href!: string;
  name!: string;
  order!: number;
}
