// Shared DTO: Copy in back-end and front-end should be identical

import { VertexPointerDto } from './vertex-pointer.dto';

export class BrokerAccountDto extends VertexPointerDto {
  id!: string;
  email!: string;
  clientId!: string;
  name!: string;
  requireRoleId!: boolean;
  requireProjectExists!: boolean;
  requireServiceExists!: boolean;
  skipUserValidation!: boolean;
  maskSemverFailures!: boolean;
}
