import { SetMetadata } from '@nestjs/common';
import { CollectionDtoUnion } from './persistence/dto/collection-dto-union.type';

export interface UserUpstreamArgs {
  collection: keyof CollectionDtoUnion;
  edgeName: string;
  param: string;
}

export const UserUpstream = (arg: UserUpstreamArgs) =>
  SetMetadata('user-upstream', arg);
