# Broker Account Tokens

Broker account tokens are how your applications authenticate with NR Broker. This page explains what they are, why you need them, and how to manage them.

## What is a broker account token?

A broker account token is a JWT (JSON Web Token) that identifies a Broker account when making API requests. Think of it as the password your applications use to talk to Broker — but instead of being stored by a person, it's used by scripts, CI/CD pipelines, and deployment tools.

When your application sends a request to Broker, it includes this token in the `Authorization` header:

```
Authorization: Bearer <your-token-here>
```

Broker uses the token to determine:
- Which Broker account is making the request
- Which services and projects that account is connected to
- What actions the account is allowed to perform

## Why do you need a broker account token?

Every interaction with Broker's API requires authentication. Your token ties your work to a specific service and team, which matters for three reasons:

### Accessing secrets

Before your application can retrieve secrets from Vault, it must open an [intention](/dev_intention_lifecycle.md) — a validated request describing what it wants to do. The intention is authenticated using your broker account token, and Broker checks that the account is connected to the service mentioned in the intention.

### Recording activity

Broker tracks all deployment activity (builds, installations, provisioning). Your token ensures this activity is attributed to the right service and team, which helps with auditing and troubleshooting.

### Enforcing business rules

Broker validates intentions against business rules — for example, "a build must be deployed to test before production." Your token tells Broker which service context to evaluate those rules against.

## How tokens relate to services and intentions

The relationship between tokens, services, and intentions works like this:

1. **Your team owns a Broker account** — The account is connected to your team (upstream) and to specific projects or services (downstream)
2. **You generate a token for that account** — The token carries the account's identity and permissions
3. **Your application uses the token to open an intention** — The intention references a service name, project, and environment
4. **Broker validates the connection** — Broker confirms the account (via the token) is actually connected to the service mentioned in the intention
5. **If valid, you proceed** — Broker returns action tokens you can use to access secrets or perform work

This means a token can only be used for services that the underlying Broker account is connected to. If your intention references a service the account doesn't have access to, Broker will deny it.

## How to generate a token

If you have "lead-developer" permissions on a team with a Broker account:

1. Open NR Broker and navigate to your Broker account
2. Click the "Access Token" link
3. Review any existing token expiry information
4. Click "Generate" to open the token creation dialog
5. Read the instructions and click "Generate" again to create the token

### Can't find your account?

If you know your team name but not the account:

1. Open NR Broker and go to the browse section
2. Select "Team" from the collection dropdown
3. Find your team (use "connected" in the "show" filter to narrow results)
4. Click on your team row, then look under "Connections" for "Broker Account"

## Managing tokens

### Renewing a token

Tokens can be regenerated at any time using the same steps above. When you renew:

- The previous token continues working for one hour (if not already expired)
- Only two tokens are ever active at the same time
- This grace period helps avoid service disruption during rotation

### Revoking a token

If you need to immediately stop all access for an account:

1. Go to the access token page for the broker account
2. Click "Revoke Token"
3. Confirm in the dialog

This blocks all active tokens immediately, including any in the grace period. Services using these tokens will lose access until a new token is generated. **This action cannot be undone.**

### Looking up an account from a token

If you have a token but aren't sure which account it belongs to:

1. Decode the token at [jwt.io](https://jwt.io) and copy the `client_id` value
2. Paste the `client_id` into NR Broker's search field
3. Click the search result and compare the expiry date with your token to confirm it's the right account

## Important notes

- **Document your account**: Record the `client_id` of any account used by a service, including where the token is stored. When using the token, make the `reason` field in intentions descriptive enough that your team understands which service or workflow opened it.
- **Where tokens are saved**: Generated tokens are automatically saved to Vault for all associated services. If your deployment has sync enabled, tokens may also be transferred to GitHub secrets or Kubernetes namespaces. See: [GitHub Sync](/operations_github_sync.md) and [Kubernetes / OpenShift Secret Sync](/operations_kubernetes_sync.md)
- **Token contents**: Token data can be read using tools like [jwt.io](https://jwt.io). The token itself is a secret — don't share it or commit it to source control.
