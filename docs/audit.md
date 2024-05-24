# Understanding the Audit Log

NR Broker outputs both audit and access log streams to a configurable HTTP endpoint. How to receive, save and make the data searchable is outside the scope of the NR Broker documentation.

It is recommended that your deployment forwards the logs to an OpenSearch deployment that also receives Vault's audit log and HTTP log as well. The logs from both NR Broker and Vault can then be examined together to give a fulsome view of activity.

## Format

The Broker audit log format is based on the Elastic Common Schema. Other than the fields under auth, field definitions can be found in the [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html) documentation.

The `event.dataset` field can be used to determine the type of event.

| event.dataset | Description |
| --- | --- |
| broker.audit | Audit events |
| generic.access | HTTP access events |

### Audit Event Actions

If you are looking for a specific type of audit event, you're going to be looking at the event.action field.

| event.action | Description |
| --- | --- |
| intention-open | Initial event when an application opens. |
| intention-close | Final event when an intention is closed. |
| authentication | JWT authentication event (occurs before intention is opened) |
| auth-database-access | Request for database access |
| auth-package-installation | Request to install a package (software) onto a server |
| auth-package-provision | Request to provision a secret id for an application |
| auth-server-access | Request to access a server |
| generate-secret-id | Generation of a secret id for an application |
| generate-token | Generation of a token for an application |

See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-action

### Audit Tracing Fields

Tracing fields allow you to track all events related to an intention or action. A unique transaction.id is assigned to all opened intentions. All audit documents related to that intention will have the same transaction.id. All audit documents related to an action within an intention will have the same trace.id (and the intention's transaction.id).

See: https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html

### Audit Auth Fields

All auth fields are custom to the Broker audit log.

| Field | Mandatory | Type | Description | Values |
| ----- | --------- | ---- | ----------- | ------ |
| auth.client_token | (grey lightbulb) | keyword | Vault client_token (wrapped) that is being provided to an application. Used for tracking usage in Vault audit Index. | See below. Hashed token |
| auth.exp | (grey lightbulb) | long | JWT Claim | See: Broker JWT |
| auth.iat | (grey lightbulb) | long | JWT Claim | See: Broker JWT |
| auth.nbf | (grey lightbulb) | long | JWT Claim | See: Broker JWT |
| auth.jti | (grey lightbulb) | keyword | JWT Claim | See: Broker JWT |
| auth.sub | (grey lightbulb) | keyword | JWT Claim | See: Broker JWT |

### Tracking Broker Created tokens in Vault Audit

In the broker audit log, locate the intention trace (transaction.id) that you are interested in. Audits with action of 'generate-secret-id' and 'generate-token' with a type of 'creation' will have the hashed token in field auth.client_token. Copy this auth.client_token value.

In the Vault audit log index, search for the unwrap event: `type: response AND auth.client_token: "hmac-sha256:..."`

Once you find the unwrap audit document, the response field contains the hashed unwrapped values.

For a 'generate-token' action, find the field response.auth.accessor (or response.auth.client_token). This is the (hashed) token the client will be used to make requests to Vault. So, you can search for usages of that token auth.accessor (or: auth.client_token). If nothing is found, the token was never used.

The Broker creation event (field: auth.client_token) can locate the Vault (field: auth.client_token) unwrap event  The Vault unwrap event (fields in response.auth.\*) can locate Vault usage events.
