# Broker Account Token

If you are assigned as a lead-developer to a team that has a Broker Account then you are able to generate tokens for that Account.

See: [Broker JWT](/operations_jwt.md)

## How to generate a Token

* Access NR Broker
* Navigate to the browser and view the 'Team' collection
* Find your team and navigate to it by clicking on the row
* Find the 'Broker Account' section and the account you want to generate the token for. The token expiry (if one has been created) will be shown. Click the 'Generate' button to open the generate/renew token dialog.
* Read the instructions and click 'Generate' button.

Teams are encouraged to document the client_id used by a service. This documentation should clearly state the locations the account is stored. The `reason` field in intentions should be descriptive enough your team understands where it is opened from.

Generated tokens are saved in vault 'tools' space for all associated services by default. This can occur even if Vault has not been enabled for a service.

The information in the token is in the clear and can be read using tools like [jwt.io](https://jwt.io).

## Update Github Secrets

### Prerequisites

* Have a [Github App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) ready

* Install the [Github App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) in all repositories associated with services. Grant the app read/write access to repository secrets.

* After a token is generated, all secrets in the tools namespace for a service (`apps-kv-mount`/tools/`project`/`service`) in Vault will be synced to the associated services' Github repository as secrets.

### Renewing a token

Tokens can be regenerated at anytime. The procedure is identical to generating a token. The previous token will continue working for an hour (if it is not already expired). Only two tokens are ever active at any time.

### Revoke a token

If you need to revoke the current token immediately, generate the token twice. If you generate the token twice then the initial token's grace period of an hour ends. You can ignore the first generated token as it is only used to cancel the grace period.

## How to Lookup an Account from a Token

If you are renewing a token for an account you are not familiar with then you may not know which account associated with it. The account can be looked up by searching for the client_id in NR Broker.

The client_id can be found in the following places:

* In the key used to save the token to the Vault tools space
* In the token's payload data by using a tool like [jwt.io](https://jwt.io)

Once you have the client_id, you can find the account by:

* Copy the client_id claim value
* Paste into the search in NR Broker
* Click the search result. The expiry date and JTI in broker and the token can also be compared to ensure you are updating the correct token.

The client_id used by your service should be documented.
