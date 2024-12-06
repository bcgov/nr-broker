import { VertexPointerDto } from './vertex-pointer.dto';

// Shared DTO: Copy in back-end and front-end should be identical

export class UserAliasDto {
  domain!: string;
  guid!: string;
  name!: string;
  username!: string;
}

export class UserDto extends VertexPointerDto {
  id!: string;
  alias?: UserAliasDto[];
  domain!: string;
  email!: string;
  guid!: string;
  name!: string;
  username!: string;
}

export interface UserSelfDto extends Omit<UserDto, 'tags'> {
  roles: string[];
}
