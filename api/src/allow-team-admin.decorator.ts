import { SetMetadata } from '@nestjs/common';

export const ALLOW_TEAM_ADMIN_METADATA_KEY = 'allow-team-admin';
export type AllowTeamAdminArgs = {
  /** Where the edge being changed comes from: the request body or the stored edge (by `:id` param). */
  edgeFrom: 'body' | 'param' | 'both';
};

/**
 * Allows users with the `team_admin` role to change user->team edges (team roles)
 * as long as the edge does not involve the requesting user.
 */
export const AllowTeamAdmin = (arg: AllowTeamAdminArgs) =>
  SetMetadata(ALLOW_TEAM_ADMIN_METADATA_KEY, arg);
