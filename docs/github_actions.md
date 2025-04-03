# GitHub Actions

These [Composite Actions](https://docs.github.com/en/actions/sharing-automations/creating-actions/about-custom-actions#composite-actions) can be used within your own GitHub action workflows to accomplish routine activities.

* [Intention open](https://github.com/bcgov-nr/action-broker-intention-open) - Opens an intention, so a service can access the Broker APIs
* [Action start](https://github.com/bcgov-nr/action-broker-action-start) - Starts an action, so progress with an intention can be tracked
* [Vault login](https://github.com/bcgov-nr/action-broker-vault-login) - Logins the service to Vault, so that automation can temporarily access the service's secrets
* [Vault provision](https://github.com/bcgov-nr/action-broker-vault-provision) - See: [Things to avoid with GitHub Actions](#avoid)
* [Vault token revoke](https://github.com/bcgov-nr/action-broker-vault-revoke) - Calls the Vault API to revoke the token
* [Action end](https://github.com/bcgov-nr/action-broker-action-end) - Ends an action, so progress with an intention can be tracked
* [Intention close](https://github.com/bcgov-nr/action-broker-intention-close) - Closes an intention, so further access to the broker is denied

### Reuse outside of GitHub

The composite actions are simple Linux scripts. If you want to use them outside of GitHub, you can copy the scripts contained in them into a Linux container or onto a Linux server. Very little or any modification should be necessary.

## Using the Actions to Access Vault

**Example**: Run Liquibase, GitHub Action, Other one-off or scheduled activities

The following example shows a database upgrade using the Vault login action.

The example uses the role id (provided or found in NR Broker) and a Broker Account token to retrieve a wrapped token with access to Vault. The Vault token will have policies that are identical to a provisioned token. The main difference is that the token cannot be renewed.

### Step 1. Create an intention file

The first step is to create the intention file. These is usually fairly easy as you likely just need to make a couple tweaks to a template file. In particular, the user id (<username>@idir or <username>@github) must be a member of your team (even if this sent by an automated process). You must also set the environment that you are accessing as well.

Jq is a tool included with all GitHub Actions that can easily do these modification.

file: intention.json
```json
{
  "event": {
    "provider": "db-demo",
    "reason": "DB Sync",
    "url": "JOB_URL"
  },
  "actions": [
    {
      "action": "database-access",
      "id": "database",
      "provision": ["token/self"],
      "service": {
        "name": "superapp-db-sync",
        "project": "superapp",
        "environment": "production"
      }
    }
  ],
  "user": {
    "name": "hgoddard@idp"
  }
}
```

You may wish (or be required) to provide additional actions to describe the event in more detail.

A periodic process that is accessing secrets may be transient. This means there is no need to save the event long-term and can be filtered out from other activites. If your activity is transient then 'event.transient' should be set to true.

**Step 2.** [Intention open](https://github.com/bcgov-nr/action-broker-intention-open)

NR Broker's API is authenticated using a Broker Account that is connected to the project/service(s) in the actions. Your team can generate a Broker Token for Broker Accounts that your team is connected to. If your Broker and repository is configured, generated tokens will be automatically sync to your GitHub secrets. See: [Broker Account Token](dev_account_token.md)

The [Intention open](https://github.com/bcgov-nr/action-broker-intention-open) Action assists with sending the intention.

The **start Action** is not needed as the **Intention open** can be configured to start a single action intention using the quickstart parameter.

```yaml
- name: Open intention
  uses: bcgov-nr/action-broker-intention-open@v2
  with:
    broker_jwt: ${{ secrets.<%= brokerJwt %> }}
    intention_path: intention.json
    quickstart: true
```

**Step 3.** [Vault login](https://github.com/bcgov-nr/action-broker-vault-login)

If the intention opens, the vault login action can be used to retrieve the Vault token.

```yaml
  - name: Login
    if: ${{ success() && env.INTENTION_TOKEN != '' }}
    uses: bcgov-nr/action-broker-vault-login@v2
    with:
      action_token: ${{ env.ACTION_TOKEN_DATABASE }}
      # The service's application role id in vault. Setting this is recommended to avoid environment mismatch.
      role_id: ${{ secrets.ROLE_ID }}
      # If the token should be returned wrapped. This must be set to true if the
      # action will send the token to an external system.
      # Default: false
      wrap_token: ''
```

**Step 4.** Use Vault Token

The output of this action is a VAULT_TOKEN environment variable. Do not send an unwrapped token outside of the action. This token can be used to access Vault as the service listed in the intention.

**Step 5.** [Vault token revoke](https://github.com/bcgov-nr/action-broker-vault-revoke)

The VAULT_TOKEN environment variable should always be explicitly revoked as soon as possible.

```yaml
  - uses: bcgov-nr/action-broker-vault-revoke@v2
    if: ${{ success() && env.INTENTION_TOKEN != '' }}
    with:
      # The vault token to revoke
      vault_token: ${{ env.VAULT_TOKEN }}
```

**Step 6.** [Intention close](https://github.com/bcgov-nr/action-broker-intention-close)

Finally, you should report the success or failure of the activity your workflow is attempting to do.

**Action end** is not needed as **Intention close** can automatically end any started actions.

```yaml
  - name: Close intention
    if: ${{ success() && env.INTENTION_TOKEN != '' }}
    uses: bcgov-nr/action-broker-intention-close@v3
    with:
      intention_token: ${{ env.INTENTION_TOKEN }}
  - name: Close intention (Failure)
    if: ${{ failure() && env.INTENTION_TOKEN != '' }}
    uses: bcgov-nr/action-broker-intention-close@v3
    with:
      intention_token: ${{ env.INTENTION_TOKEN }}
      outcome: failure
```

## Things to avoid with GitHub Actions {#avoid}

GitHub Actions can be used to retrieve secrets and run tasks. Any secret or token that is retrieved should always be wrapped using Vault if it will be sent outside the current job — even within the same action.

GitHub Actions should utilize the login action to ensure that they use non-renewable tokens with configurable TTLs (time-to-live).

GitHub Actions should NOT use the [Vault provision](https://github.com/bcgov-nr/action-broker-vault-provision) action to provide an application with a Vault token. Provisioning in this way can introduce security risks as the tokens are renewable. It is strongly recommended that each instance of an application use a unique token. Otherwise, a single token may live on forever. For example, in OpenShift, token provisioning should occur at pod (application) startup, rather than during deployment via a GitHub Action.

OpenShift Provisioning: https://github.com/bcgov/nr-broker-openshift-knox-retriever
