import { SetMetadata } from '@nestjs/common';
import { CollectionDtoUnion } from './persistence/dto/collection-dto-union.type';

export const ALLOW_OWNER_METADATA_KEY = 'allow-owner';
export type AllowOwnerArgs =
  | AllowOwnerCollectionArgs
  | AllowOwnerEdgeArgs
  | AllowOwnerVertexArgs;
export interface AllowOwnerBaseArgs {
  graphIdFromBodyPath?: string;
  graphIdFromParamKey?: string;
  permission?: string;
  sudoMaskKey?: string;
}

export interface AllowOwnerCollectionArgs extends AllowOwnerBaseArgs {
  graphObjectType: 'collection';
  graphObjectCollection?: keyof CollectionDtoUnion;
  graphObjectCollectionFromParamKey?: string;
}

export interface AllowOwnerEdgeArgs extends AllowOwnerBaseArgs {
  graphObjectType: 'edge';
}

export interface AllowOwnerVertexArgs extends AllowOwnerBaseArgs {
  graphObjectType: 'vertex';
}

export const AllowOwner = (arg: AllowOwnerArgs) =>
  SetMetadata(ALLOW_OWNER_METADATA_KEY, arg);
