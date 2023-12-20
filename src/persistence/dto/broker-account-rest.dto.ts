// Shared DTO: Copy in back-end and front-end should be identical

export class BrokerAccountRestDto {
  id: string;
  email: string;
  clientId: string;
  name: string;
  vertex: string;
  requireRoleId: boolean;
  requireProjectExists: boolean;
  requireServiceExists: boolean;
}
