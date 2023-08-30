// Shared DTO: Copy in back-end and front-end should be identical

export class TeamSearchDto {
  id!: string;
  email!: string;
  name!: string;
  vertex!: string;
  website?: string;
}
