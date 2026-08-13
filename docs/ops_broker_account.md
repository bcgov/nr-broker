# What is a Broker account?

A Broker account is the identity your applications use when they need to access secrets, deploy software, or perform other automated tasks through Broker. Think of it like a service account or API key for your team.

If you need a new Broker account created or modified, contact your organization's Broker administrator.

## Why your team needs Broker accounts

When your applications need to do things like:

- **Access secrets** — Retrieve passwords, API keys, and other sensitive configuration from HashiCorp Vault
- **Deploy software** — Record deployment activities so Broker can validate business rules
- **Build software** — Record build artifacts to help validate future deployments
- **Automate tasks** — Perform routine operations without manual intervention

...they use a Broker account to do it. This is separate from your personal login to Broker.

## How accounts connect to your work

Each Broker account is linked to your team (upstream) and to projects or services (downstream). This connection tells Broker:

- Which secrets the account can access
- What actions the account can perform
- Who on your team can manage the account

For example, if your team has a project called "Customer Portal" with multiple services (web frontend, API backend, database), you might create separate Broker accounts for each service. Each account would only have access to the secrets that specific service needs. Alternatively, you could create a single account for the entire project. Broker is flexible in how you set this up.

## Keeping track of activity

Everything your applications do with a Broker account is recorded in the audit log. This makes it easy to see what happened, when, and which service was involved — useful for troubleshooting or compliance reviews.

## Managing account tokens

To use a Broker account, you need an account token. This token authorizes requests on behalf of the account and must be rotated periodically.

### Who can manage tokens?

Team members with "lead-developer" permissions can:
- Generate new tokens for accounts
- Revoke tokens that are no longer needed

As a team owner, make sure there's always at least one team member who can manage tokens. To assign roles, see [Manage My Team](/ops_manage_team.md).

### Getting a token

For step-by-step instructions, see [Broker Account Tokens](/dev_account_token.md).

### Security best practices

To keep your Broker access secure:
- Store account tokens in secret managers, not in source code
- Rotate tokens regularly or when team members leave
- Revoke accounts that are no longer in use
- Check the audit log if you see unexpected activity
