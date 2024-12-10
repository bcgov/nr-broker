import {
  IsString,
  IsDefined,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CollectionBaseDto, VertexPointerDto } from './vertex-pointer.dto';
import { Type } from 'class-transformer';

// Shared DTO: Copy in back-end and front-end should be identical

export class UserAliasDto {
  @IsString()
  @IsDefined()
  domain!: string;

  @IsString()
  @IsDefined()
  guid!: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsDefined()
  username!: string;
}

export class UserBaseDto extends CollectionBaseDto {
  @ValidateNested()
  @IsOptional()
  @IsArray()
  @Type(() => UserAliasDto)
  alias?: UserAliasDto[];

  @IsString()
  @IsDefined()
  domain!: string;

  @IsString()
  @IsDefined()
  email!: string;

  @IsString()
  @IsDefined()
  guid!: string;

  @IsString()
  @IsDefined()
  name!: string;

  @IsString()
  @IsDefined()
  username!: string;
}

export class UserDto extends UserBaseDto implements VertexPointerDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  vertex!: string;
}

export interface UserSelfDto extends Omit<UserDto, 'tags'> {
  roles: string[];
}
