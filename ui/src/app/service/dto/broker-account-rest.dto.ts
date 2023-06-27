export interface BrokerAccountRestDto {
  id: string;
  email: string;
  clientId: string;
  name: string;
  vertex: string;
  requireRoleId: boolean;
  requireProjectExists: boolean;
  requireServiceExists: boolean;
}
