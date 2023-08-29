import { SetMetadata } from '@nestjs/common';
import { CollectionDtoUnion } from './persistence/dto/collection-dto-union.type';

export type UserUpstreamArgs =
  | UserUpstreamEdgeArgs
  | UserUpstreamCollectionArgs;
export interface UserUpstreamBaseArgs {
  graphBodyKey?: string;
  graphParamKey?: string;
  requiredEdgetoUserName: string;
  requiredSourceVertexName?: keyof CollectionDtoUnion;
}

export interface UserUpstreamEdgeArgs extends UserUpstreamBaseArgs {
  graphObjectType: 'vertex';
  collection: keyof CollectionDtoUnion;
  retrieveCollection: 'byId' | 'byVertex';
}

export interface UserUpstreamCollectionArgs extends UserUpstreamBaseArgs {
  graphObjectType: 'edge';
}

export const UserUpstream = (arg: UserUpstreamArgs) =>
  SetMetadata('user-upstream', arg);
