# Team administrator

The `team_admin` role gives a user global access to manage team roles. It is added to the user's token roles (the same place as `admin`; see `OAUTH2_CLIENT_MAP_ROLES`).

## What a team administrator can do

- Assign, change, and revoke roles (user to team edges) for any team.
- Use the team members dialog in the UI on any team.

## Limits

- A team administrator cannot assign, change, or revoke a role that involves themselves. Another team administrator, an `admin`, or a team owner must make that change.
- If the team administrator is also an owner of the team, owner permissions still apply as usual.
- The role only covers user to team edges. It does not allow other graph changes; use `admin` for those.

## Enforcement

The API checks the role in `BrokerOidcAuthGuard` for routes marked with `@AllowTeamAdmin` (add, edit, and delete edge in `graph.controller.ts`). For edits, both the stored edge and the requested edge must be user to team edges that do not involve the requesting user.
