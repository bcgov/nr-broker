import { VertexPointerRestDto } from './vertex-pointer-rest.dto';

// Shared DTO: Copy in back-end and front-end should be identical
export class UserAliasRestDto {
  domain!: string;
  guid!: string;
  name!: string;
  username!: string;
}

export class UserRestDto extends VertexPointerRestDto {
  id!: string;
  alias?: UserAliasRestDto[];
  domain!: string;
  email!: string;
  guid!: string;
  name!: string;
  username!: string;
}

export interface UserSelfRestDto extends Omit<UserRestDto, 'tags'> {
  roles: string[];
}
