import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class UserGroupRestDto {
  domain?: string;
  id?: string;
  name?: string;
}

export class UserRestDto extends VertexPointerRestDto {
  id!: string;
  domain!: string;
  email!: string;
  group?: UserGroupRestDto;
  guid!: string;
  name!: string;
  username!: string;
}
