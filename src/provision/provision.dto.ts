export class ProvisionDto {
  environment: string;
  roleId: string;
  type: 'application' | 'config';
}
