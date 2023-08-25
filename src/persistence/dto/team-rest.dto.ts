// Shared DTO: Copy in back-end and front-end should be identical

export class TeamSearchDto {
  id!: string;
  email!: string;
  name!: string;
  website?: string;
  upstream_edge!: any;
  upstream!: any;
  downstream_edge!: any;
  downstream!: any;
}
