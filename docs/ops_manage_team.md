# Manage my teams

You can view teams in the Broker by navigating to the browse page (/browse) and selecting the team collection from the dropdown menu. To see only the teams of which you are a member, select show "connected." For convenience, a direct link is available in the sections tab on the home page.

If you are assigned the owner role, membership management has been delegated to you. Owners can edit team membership by clicking the "Members" button in the top-right corner.

## How to add/remove users

* Access NR Broker
* Navigate to the browser and view the 'Team' collection
* Find the team to modify and navigate to it by clicking on the row
* Click the "Members" button
* Modify role membership

**To add:** Select the desired role from the dropdown menu. Type until the desired user appears, then select them and click "Add."

> User not showing? Users are imported the first time they login to NR Broker. The easiest way to add users is to send them the link and have them login.

**To remove:** Click the user to select them and then click remove for the role

## What do the roles mean?

The roles are defined on the Team tab in the browser section. The roles may be used by external products that read NR Broker's database to grant permissions. For further information, please read your own documention that should be linked from your Broker deployment's homepage.

## How to reassign ownership

To assign a new person as the owner of the team, add the new person as an owner of the team. If required, this person can then remove you as an owner of the team.

---

## Advanced: GitHub account linking

If your deployment uses GitHub for source control and has GitHub sync enabled, team members should link their Broker account to their GitHub account. This allows Broker to use GitHub usernames as aliases, which is required for user sync and for referencing users in intentions.

### Why link a GitHub account?

When someone links their GitHub account:

- **User sync works correctly** — Broker can match team members to GitHub collaborators by their linked GitHub identity, so repository access is kept in sync with team roles
- **Intentions accept GitHub usernames** — Developers can reference `username@github` in intention user fields instead of their internal directory ID
- **Automated processes work smoothly** — CI/CD pipelines and GitHub Actions can identify the correct team member without needing internal directory lookups

### How users link their account

The process depends on your deployment configuration. In most setups:

1. The user logs in to NR Broker
2. They navigate to their profile or preferences section
3. They click a link to authorize Broker to connect to their GitHub account
4. After authorizing, their GitHub username is stored as an alias linked to their Broker identity

If you don't see a GitHub linking option, your deployment may not have this feature enabled — contact your Broker administrator.

### Ensuring your team links their accounts

As a team owner, you can check whether team members have linked their GitHub accounts:

1. Open NR Broker and navigate to the browse section
2. Select "User" from the collection dropdown
3. Search for a team member by name
4. Check if they have a GitHub alias listed on their user record

If a team member hasn't linked their GitHub account, let them know so they can complete the linking process. Without it, user sync may not work correctly for repositories they should have access to.

### How user sync uses linked accounts

When GitHub user sync runs, Broker reads the graph to find users connected to a repository through team roles. It then compares those users with the current list of GitHub collaborators. For this comparison to work, Broker needs to know each user's GitHub identity — which is why account linking is important.

If a user hasn't linked their GitHub account, Broker cannot match them to a GitHub collaborator, and they may be missing from the repository or incorrectly removed during sync. See: [GitHub Sync](/operations_github_sync.md) for more details on how user sync works.
