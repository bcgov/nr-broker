// Shared DTO: Copy in back-end and front-end should be identical

export class RoleChipMappingDto {
  role!: string;
  label!: string;
  description!: string;
}

export class ConnectionConfigDto {
  id!: string;
  collection!: string;
  description!: string;
  href!: string;
  imageUrl?: string;
  imageEmbedded?: string;
  name!: string;
  order!: number;
  roleChipMappings!: RoleChipMappingDto[];
}
