# Broker Account Token

If you are assigned as a lead developer to a team that has a Broker Account, you can generate tokens for that account.

See: [Broker JWT](/operations_jwt.md)

## How to generate a token

1. Access NR Broker and navigate to the Broker Account
2. Click the "Access Token" link for that account
3. On the access token page, review the token expiry information (if a token has been created)
4. Click the "Generate" button to open the generate/renew token dialog
5. Read the instructions and click "Generate" to create the token

### Finding an account when you only know the team

If you need to find a broker account but only know the team name:

1. Access NR Broker
2. Navigate to the browse section and view the "Team" collection
3. Find your team and click on the row to open it. It may help to select "connected" in the "show" dropdown.
4. Locate the "Connections" section and click "Broker Account" to find the account you want to generate a token for

Teams are encouraged to document the client_id of the account used by a service. This documentation should
clearly state the locations where the account token is stored if used in non-standard places. When using the token,
the `reason` field in intentions should be descriptive enough that your team understands where it is opened from.

Generated tokens are saved in the Vault "tools" space for all associated services by default. This can occur even if Vault has not been enabled for a service. Vault synchronization may be set up to transfer the secret to other locations. See: [Tools Secret Synchronization](/operations_secret_sync.md)

The information in the token is in the clear and can be read using tools like [jwt.io](https://jwt.io). The token itself is a secret that should not be shared.

### Renewing a token

Tokens can be regenerated at any time. The procedure is identical to generating a token. The previous token will continue working for one hour after renewal (if it is not already expired). Only two tokens are ever active at any time.

### Revoke a token

If you need to immediately revoke all active tokens for an account:

1. Navigate to the access token page for the broker account
2. Click the "Revoke Token" button
3. Confirm the revocation in the dialog

This will immediately block all active tokens for the account, including any tokens in the grace period. Any services using these tokens will lose access until a new token is generated. This action cannot be undone.

## How to look up an account from a token

If you are renewing a token for an account you are not familiar with, you may not know which account is associated with it. The account can be looked up by searching for the client_id in NR Broker.

The client_id can be found in the following places:

* In the key used to save the token to the Vault tools space
* In the token's payload data using a tool like [jwt.io](https://jwt.io)

Once you have the client_id, you can find the account by:

1. Copy the client_id claim value
2. Paste it into the search field in NR Broker
3. Click the search result
4. Compare the expiry date and JTI in Broker with the token to ensure you are updating the correct token

The client_id used by your service should be documented.
