// Shared DTO: Copy in back-end and front-end should be identical

import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

export class BrokerAccountRestDto extends VertexPointerRestDto {
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
