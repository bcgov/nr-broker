# Understanding the Audit Log

NR Broker outputs both audit and access log streams to a configurable HTTP endpoint and a rotated log file.

## Format

The Broker audit log format is based on the Elastic Common Schema. Other than the fields under auth, field definitions can be found in the [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html) documentation.

The `event.dataset` field can be used to determine the type of event.

| event.dataset | Description |
| --- | --- |
| broker.audit | Audit events |
| generic.access | HTTP access events |

### Audit Event Actions

If you are looking for a specific type of audit event, you're going to be looking at the event.action field.

See: https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-action

| event.action | Description |
| --- | --- |
| authentication | JWT authentication event (occurs before intention is opened) |
| intention-close | Final event when an intention is closed. |
| intention-open | Initial event when an application opens. |
| package-approval |  |
| process-end |  |
| process-start |  |
| sync-tools |  |
| generate-secret-id | Generation of a secret id for an application |
| token-generation | Generation of a token for an application |

#### Actions

All "*action*-" events also have an "*auth*-" counterpart that records success or failure authorizing an action when an intention is opened.

| event.action | Description |
| --- | --- |
| *action*-backup | Backup of data. |
| *action*-database-access | Accesses a database. |
| *action*-server-access | Accesses a server. |
| *action*-package-configure | Alters an installed package's configuration. |
| *action*-package-installation | Installs a package (software) onto a server. |
| *action*-package-provision | Provision a secret id for a service. Can also configure a package. |

### Audit Tracing Fields

Tracing fields allow you to track all events related to an intention or action. A unique transaction.id is assigned to all opened intentions. All audit documents related to that intention will have the same transaction.id. All audit documents related to an action within an intention will have the same trace.id (and the intention's transaction.id).

See: https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html

### Audit Auth Fields

All auth fields are custom to the Broker audit log. If you are using a strict Elastic Common Schema, these fields should be added.

| Field | Mandatory | Type | Description | Values |
| ----- | --------- | ---- | ----------- | ------ |
| auth.client_token | No | keyword | Vault client_token (wrapped) that is being provided to an application. Used for tracking usage in Vault audit Index. | See below. Hashed token |
| auth.exp | No| long | JWT Claim | See: [Broker JWT](operations_jwt.md) |
| auth.iat | No | long | JWT Claim | See: [Broker JWT](operations_jwt.md) |
| auth.nbf | No | long | JWT Claim | See: [Broker JWT](operations_jwt.md) |
| auth.jti | No | keyword | JWT Claim | See: [Broker JWT](operations_jwt.md) |
| auth.sub | No | keyword | JWT Claim | See: [Broker JWT](operations_jwt.md) |

### Tracking Broker Created tokens in Vault Audit

In the broker audit log, locate the intention trace (transaction.id) that you are interested in. Audits with action of 'generate-secret-id' and 'generate-token' with a type of 'creation' will have the hashed token in field auth.client_token. Copy this auth.client_token value.

In the Vault audit log index, search for the unwrap event: `type: response AND auth.client_token: "hmac-sha256:..."`

Once you find the unwrap audit document, the response field contains the hashed unwrapped values.

For a 'generate-token' action, find the field response.auth.accessor (or response.auth.client_token). This is the (hashed) token the client will be used to make requests to Vault. So, you can search for usages of that token auth.accessor (or: auth.client_token). If nothing is found, the token was never used.

The Broker creation event (field: auth.client_token) can locate the Vault (field: auth.client_token) unwrap event  The Vault unwrap event (fields in response.auth.\*) can locate Vault usage events.

## Searching and combining with other services

This information is deployment specific. Your deployment should show a link to your documentation on the homepage.

## Setting up an audit data ingestion pipeline

How to receive, save and make the data searchable is outside the scope of the NR Broker documentation.

It is recommended that your deployment forward NR Broker's logs to a search and observability suite like OpenSearch. Vault's audit log and HTTP log should be forward here as well. The logs from both NR Broker and Vault should be examined together to give a fulsome view of activity.
