import { SetMetadata } from '@nestjs/common';

export interface AllowBodyValueArgs {
  path: string;
  value: string;
}

export const ALLOW_BODY_VALUE_METADATA_KEY = 'allow-body-value';
export const AllowBodyValue = (arg: AllowBodyValueArgs[]) =>
  SetMetadata(ALLOW_BODY_VALUE_METADATA_KEY, arg);
