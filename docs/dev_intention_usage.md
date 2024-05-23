# Intention Usage

**Prerequisites:** Action started. See [Intention Lifecycle](/dev_intention_lifecycle.md)

Once you have used your Broker Token to open an intention, you can use the provided action tokens to retrieve applications secrets from the Broker API.

## Provisioning or Accessing

The first step is to determine if you are provisioning an application or just accessing its secrets. In this context, provisioning means setting up an application to have continued access to the Vault. Accessing means you need temporary access to accomplish some goal.

**Examples**

* Provision: Start an OpenShift pod, Run a server application on premise and other continuous activities
* Access: Run Liquibase, Github action, other one-off or scheduled activities

It is not recommended to use the "access" pattern to simply copy the secrets and then do a continuous activity. The source of truth for the secrets should always be Vault. Tools like envconsul and consul-template should be used to manage the provisioned Vault token and keep the secrets that your application is using up-to-date.

## Provisioning Action

If you are following the provision workflow, you'll be using the static role id unique to the instance of your deployment (retrieved via Broker UI or API) and a secret id (retrieved via Broker API) to login your application to Vault.

The first step is to open your intention with the Broker API. You must provide your team's JWT as an authorization bearer token.

You must modify the event, service and user fields in this example. In particular, the user id (<username>@idir or <username>@github) must be a member of your team (even if this sent by an automated process). Jq is an excellent tool for doing this modification.

You may wish (or be required) to provide additional actions to describe the intention in more detail. (Example: accessing a server to do the provision)

**Call  1.** POST /v1/intention/open

Header: "Authorization: Bearer $BROKER_JWT"

```json
{
  "event": {
    "provider": "provision-fluentbit-demo",
    "reason": "Job triggered",
    "url": "JOB_URL"
  },
  "actions": [
    {
      "action": "package-provision",
      "id": "provision",
      "provision": ["approle/secret-id"],
      "service": {
        "name": "fluent-bit",
        "project": "fluent",
        "environment": "production"
      }
    }
  ],
  "user": {
    "id": "USER_ID"
  }
}
```

The response will look like this:

```json
{
  "actions": {
    "provision": {
      "token": "a129cfea-9059-4494-9ae6-45c0c8ad60af",
      "trace_id": "0f528c8051f17a13902cb5bede3530650f1cb84fb3c8a61c0a8f28ab4ab3fcb7",
      "outcome": "success"
    }
  },
  "token": "6f82da8d-f230-4986-9349-f807dcb94c4c",
  "transaction_id": "5cc4d86887e9292e2db34aa9bec31c936d39149a28a2144390cfe415f9e1839c",
  "ttl": 300
}
```

The actions field will have keys that correspond to the action's id field passed in as part of the intention. Actions all have unique tokens that you'll need to utilize other Broker API calls. Every token field should be treated as a password and never logged or saved to disk. The trace and transaction ids are safe to log. They can be used to view the activity in the Broker Audit log on OpenSearch.

Next, let's get that secret id so that we can provision our application.

**Call  2.** POST /v1/provision/approle/secret-id

There is no body to send. Two headers must be sent:

* x-vault-role-id (provided to your team)
* x-broker-token (the token [.actions.provision.token] received for the action in the response to the intention open)

```json
{
  "request_id": "",
  "lease_id": "",
  "renewable": false,
  "lease_duration": 0,
  "data": null,
  "wrap_info": {
    "token": "VAULT_TOKEN",
    "accessor": "sJ1fOnO2fuQXoq50j5Dw99Qj",
    "ttl": 60,
    "creation_time": "2022-12-29T00:11:16.983569834Z",
    "creation_path": "auth/vs_apps_approle/login",
    "wrapped_accessor": "IiWZEyipP1zYipfELdfF3xKy"
  },
  "warnings": null,
  "auth": null
}
```

This is the wrapped response to calling the Vault API: https://developer.hashicorp.com/vault/api-docs/auth/approle#generate-new-secret-id

The Vault API (not the Broker API) should be used with this response. This response is wrapped. It is possible to use the REST API to unwrap the response. However, you must use the unwrap API (POST /sys/wrapping/unwrap) and then fallback on the cubbyhole API (GET /cubbyhole/response) if that fails with the not found status code (404). The later API is deprecated and at some point Vault may switch to the former API. The vault cli handles checking both APIs. See: Vault cli code

```
WRAPPED_VAULT_TOKEN=$(echo $VAULT_TOKEN_WRAP | jq -r '.wrap_info.token')
SECRET_ID=$(VAULT_TOKEN=$WRAPPED_VAULT_TOKEN vault unwrap -field=secret_id)
```

**Call  3.** POST /v1/auth/vs_apps_approle/login

After you unwrap this response, you can send the role id and the secret id as they body of this request to login as the application. Typically, the returned secret id can only be used once. So, if you are provisioning in multiple pods, you need to provision each pod individually.

See: https://developer.hashicorp.com/vault/api-docs/auth/approle#login-with-approle

The mount point for authentication as an application is: vs_apps_approle. So, the full path to the login be '/v1/auth/vs_apps_approle/login' and not '/v1/auth/approle/login'.

**Call  4.** POST /v1/intention/close

You're done! Pass in '.token' from the open response as the 'x-broker-token' header to authenticate this call.

### Related tools

* Consul Template
* Envconsul

## Accessing Action

If you are following the access workflow, you'll be using the role id (provided) to retrieve a wrapped token with access to Vault. The token will have policies that are identical to a provisioned token. The 'provision/token/self' API allows you to skip sending a request to Vault to do the login yourself. The main difference is that the token cannot be renewed. The example here assumes some kind of database upgrade is going on.

The first step is to open your intention with the Broker API. You must provide your teams JWT as an authorization bearer token.

You must modify the event, service and user fields in this example. In particular, the user id (<username>@idir or <username>@github) must be a member of your team (even if this sent by an automated process). Jq is an excellent tool for doing this modification.

You may wish (or be required) to provide additional actions to describe the event in more detail.

**Call  1.** POST /v1/intention/open

Header: "Authorization: Bearer $BROKER_JWT"

```json
{
  "event": {
    "provider": "provision-fluentbit-demo",
    "reason": "Job triggered",
    "url": "JOB_URL"
  },
  "actions": [
    {
      "action": "database-access",
      "id": "database",
      "provision": ["token/self"],
      "service": {
        "name": "fluent-bit",
        "project": "fluent",
        "environment": "production"
      }
    }
  ],
  "user": {
    "id": "USER_ID"
  }
}
```
See the provision example for the response. The response will be the same except the action token field will be '.actions.database.token' because the id here is 'database'.

Optionally, you may wish to call '/v1/intention/action/start' to indicate when the action starts.

**Call  2.** POST /v1/provision/token/self

There is no body to send. Two headers must be sent:
* x-vault-role-id (provided to your team)
* x-broker-token (the token [.actions.provision.token] received for the action in the response to the intention open)

The response here is the wrapped approle login for the service. The Vault API (not the Broker API) should be used with this response. You may need to unwrap this response, but, many tools can unwrap the token themselves.

See: https://developer.hashicorp.com/vault/api-docs/auth/approle#login-with-approle

After finishing your activity, be sure to revoke the token and then close the intention. Optionally, you may wish to call '/v1/intention/action/end' to indicate when the action ends.

**Call  3.** POST /v1/intention/close

You're done! Pass in '.token' from the open response as the 'x-broker-token' header to authenticate this call.

### Related tools

* Consul Template
* Envconsul

### Broker Examples

* https://github.com/bcgov-nr/nr-broker/blob/main/scripts/provision-db-demo.sh
* https://github.com/bcgov-nr/nr-broker/blob/main/scripts/provision-fluentbit-demo.sh