# What is a Broker account?

A Broker account connects your team to the projects and services you work with. It's the identity your applications use when they need to access secrets, deploy software, or perform other automated tasks through Broker.

Please contact your organization's Broker administrator to have a new Broker account created or modified.

## How Broker accounts work

Think of a Broker account like a service account or API key for your team. This is different from your personal identity in Broker.

When you use a Broker account, Broker knows:
- Which projects, services, secrets, and repositories the account can access
- What actions the account is allowed to perform
- How to track and audit those actions

## Broker accounts and teams

Each Broker account is connected to upstream teams and downstream projects or services. The upstream teams determine the individuals that have access to the downstream objects.

For example, if your team has a project called "Customer Portal" with multiple services (web frontend, API backend, database), you might create separate Broker accounts for each service. Each account would have access only to the secrets and resources that specific service needs. Another popular approach is to create a single account for the project. Broker is very flexible in how you connect accounts.

## Using Broker accounts

Your applications use Broker accounts to:
- **Access secrets** - Get passwords, API keys, and other sensitive configuration from HashiCorp Vault
- **Build software** - Record build activities to assist with validating business rules
- **Deploy software** - Record deployment activities and validate business rules
- **Automate tasks** - Perform routine operations without manual intervention

All activity performed with a Broker account is tracked in the audit log, making it easy to see what happened and when.

## Broker account tokens

To use a Broker account, you use an account token. This token authorizes you to make requests on behalf of the account. The token must be periodically rotated to prevent stale tokens from existing forever.

Teams will be contacted to renew their token prior to expiry.

### Managing access to tokens

Team members with 'lead-developer' permissions can:
- Generate tokens for those accounts
- Revoke accounts that are no longer needed

The team owner should ensure there is always a team member with access to manage tokens. To create or manage team roles, see [Manage my team](/ops_manage_team.md).

### Generating a token

For details on generating tokens, see [Generating tokens](/dev_account_token.md).

### Security best practices

To keep your Broker access secure:
- Store account tokens securely (use secret managers, not source code)
- Rotate tokens regularly or when team members leave
- Revoke accounts that are no longer in use
- Monitor the audit log for unexpected activity
