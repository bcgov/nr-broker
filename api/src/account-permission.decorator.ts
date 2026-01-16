import { SetMetadata } from '@nestjs/common';

export const AccountPermission = (arg: string) =>
  SetMetadata('account-permission', arg);
