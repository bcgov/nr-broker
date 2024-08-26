# Broker Account Token

If you are assigned as a lead developer to a team that has a Broker Account then you are able to generate tokens for that Account.
The information in the token is in the clear and can be read using tools like jwt.io.

See: [Broker JWT](/operations_jwt.md)

## How to generate a Token

* Access NR Broker
* Click on the Teams section. By default, only your teams are shown.
* Click the row to open your team page.
* Find the 'Broker Account' section and the account you want to generate the token for. The token expiry (if one has been created) will be shown. Click the 'Generate' button to open the generate/renew token dialog.
* Read the instructions and click 'Generate' button.

Teams are encouraged to document the client_id used by a service. This documentation should clearly state the locations the account is used.

## Update the Token into the Github Repo

When the generate a token, by default the new token will be saved in vault 'tools' space along with project and service folders this broker account associated with and sync to all Github Repos of services.

* Have the Github App [broker-jwt-update](https://github.com/organizations/bcgov-nr/settings/apps/broker-jwt-update) to grant the modification access to the individual service Github Repo secrets.

* After a token is generated, all secrets under tools/project/service in vault will be synced to this service Github repo secrets.

### Renewing a token

Tokens can be regenerated at anytime. The procedure is identical to generating a token. The previous old token will continue working for an hour (if it is not already expired).

## How to Lookup an Account from a Token

If you are renewing a token for an account you are not familiar with then you may not know which account associated with it. The account can be looked up by:

* Copy the existing token† and view the token payload by using a tool like jwt.io.
* Copy the client_id claim value
* Paste into the search in NR Broker
* Click the search result. The expiry date in broker and the token can also be compared to ensure you are updating the correct location.

† If you do not have access to view the token (GitHub secret?) then hope the client_id was documented somewhere.