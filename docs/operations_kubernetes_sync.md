# Kubernetes / OpenShift Secret Sync

NR Broker can synchronize **tools (CI/CD) secrets** from Vault into Kubernetes (OpenShift) project secrets. This is intended for secrets that CI/CD pipelines and build tooling need — such as Broker account tokens and other infrastructure credentials — not for runtime application secrets.

For runtime service secrets, applications should authenticate using their [service AppRole](/dev_vault_for_developers.md) to read secrets directly from Vault.

For general information about how the collection sync system works, see [Collection Sync Queues](/dev_customize_collection_sync.md).

To use the feature, developers need a service account that NR Broker can use to get, create, update, and patch Secrets in the Kubernetes or OpenShift namespace. They also need to be assigned to a team attached to the service being synced, as well as access to the cloud configuration in Vault. Ask the NR Broker administrator to complete the graph authorization.

## Service account

Create a service account in the target namespace and grant it `get`, `create`, `update`, and `patch` permissions for Secrets. Pass its bearer token to NR Broker as `serviceAccountToken`.

```bash
kubectl create serviceaccount nr-broker-sync --namespace <project-name>
kubectl create role nr-broker-sync \
	--namespace <project-name> \
	--verb=get --verb=create --verb=update --verb=patch \
	--resource=secrets
kubectl create rolebinding nr-broker-sync \
	--namespace <project-name> \
	--role=nr-broker-sync \
	--serviceaccount=<project-name>:nr-broker-sync
```

For OpenShift, use the equivalent commands:

```bash
oc create serviceaccount nr-broker-sync --namespace <project-name>
oc create role nr-broker-sync \
	--namespace <project-name> \
	--verb=get --verb=create --verb=update --verb=patch \
	--resource=secrets
oc create rolebinding nr-broker-sync \
	--namespace <project-name> \
	--role=nr-broker-sync \
	--serviceaccount=<project-name>:nr-broker-sync
```

Create the token with:

```bash
oc create token nr-broker-sync \
	--namespace <project-name> \
	--duration=87600h
```

On Kubernetes 1.24+, create a service-account token Secret and read its token and CA data as described in the [development setup guide](/dev_kubernetes_sync.md).

## Configure the sync mapping

Store the configuration in Vault at `clouds/<cloud-name>/<project-name>/nr-broker-sync`. Broker reads it each time a sync job runs.

```bash
vault kv put clouds/<cloud-name>/<project-name>/nr-broker-sync \
	serviceAccountToken="<service-account-token>" \
	caData="<base64-ca-cert>" \
	version="1" \
	secrets='[{
		"service": "<service-name>",
		"environment": "<environment>",
		"brokerTokenClientId": "<broker-account-client-id>",
		"destinationSecretName": "<secret-name>"
	}]'
```

The configuration fields are:

| Field | Required | Description |
| --- | --- | --- |
| `serviceAccountToken` | Yes | Bearer token for the Kubernetes service account with `secrets` permissions. |
| `caData` | No | Base64-encoded CA certificate for the API server. Required for clusters with a self-signed certificate. |
| `version` | No | Configuration version carried by Broker for forward compatibility. It does not change sync behavior. |
| `rejectNonCompliantKeys` | No | When `true`, the sync fails if a source or mapped key is not DNS-1123 compliant. The default is `false`, which rewrites non-compliant keys. |
| `secrets` | Yes | JSON array of secret mapping objects. |

Each mapping supports:

| Field | Required | Description |
| --- | --- | --- |
| `service` | Yes | Service name authorized for the project or Cloud. The source path is built as `tools/<project>/<service>`. |
| `path` | No | Sub-path appended to the service's tools secret path. |
| `environment` | No | Environment used to resolve the service AppRole and add `role_id`. |
| `brokerTokenClientId` | No | Broker account client ID used to add the matching source token as `token`. |
| `destinationSecretName` | Yes | Kubernetes Secret name to create or replace. |
| `keyMapping` | No | Mapping from source key names to destination key names. |

For example:

```json
{
	"service": "my-app",
	"path": "credentials",
	"destinationSecretName": "my-app-credentials",
	"keyMapping": {
		"DB_PASSWORD": "DATABASE_PASSWORD"
	}
}
```

## Secret key normalization

Kubernetes `Secret` data keys must be a valid DNS-1123 label: lowercase letters, digits, `.`, `-`, and `_`, no more than 63 characters. By default Broker rewrites every source key (after any `keyMapping`) into a compliant form so the Kubernetes API accepts the secret:

- uppercase letters are lowercased,
- any run of disallowed characters is replaced with a single `-`,
- leading and trailing `-` are trimmed,
- the result is truncated to 63 characters.

A key that collapses to an empty string after normalization is skipped (and logged) rather than written as an empty key.

To prevent silent rewriting, configure `rejectNonCompliantKeys: true` in `nr-broker-sync`. With this option the sync fails the affected mapping when a key is not already DNS-1123 compliant, instead of rewriting it. This is useful when the consuming application expects exact key names.

## Managed secrets label

Every secret that Broker creates or updates is labeled `nr-broker.io/managed-by=nr-broker`, so managed secrets can be identified and selected (for example with `kubectl get secrets -l nr-broker.io/managed-by=nr-broker`).

When a managed secret already exists, Broker **replaces it in full** with the freshly computed data on each sync. This is the intended behaviour: the managed secret always reflects the current source in Vault. Keys that are no longer present in the source are removed, and keys that are no longer managed by Broker are not touched.

## Expected graph setup

When sync is configured, developers should expect the NR Broker graph to include:

- A **Cloud** representing the Kubernetes or OpenShift cluster.
- An **OpenShift Project** representing the target namespace, linked to the Cloud with a `project` edge.
- A **Service** for each service whose tools secrets can be synchronized.
- A team attached to the Service, with the developer assigned to that team.
- A restricted `deploys` edge from the Service to either the OpenShift Project or its parent Cloud. This edge identifies which services are authorized to sync into the project.

The Cloud will be linked to its owning Team with an `operates` edge. Developers can use these relationships to confirm that the requested service, project, and access assignment are connected before triggering a sync.

## Administrator setup

The following steps update the NR Broker graph to allow the sync of services. They are intended for the NR Broker or platform administrator. Complete them before developers trigger a sync.

### Create the Cloud and OpenShift Project

Create a **Cloud** object for the Kubernetes or OpenShift cluster. Set its type to `openshift` and its API URL to the cluster API endpoint. The Cloud name is used in the Vault path `clouds/<cloud-name>/<project-name>/nr-broker-sync`.

Create an **OpenShift Project** object for the target namespace. Use the Kubernetes namespace as the project name and enable **Enable secret sync**. Link the OpenShift Project to the Cloud with a `project` edge, and link the Cloud to its owning Team with an `operates` edge.

These objects identify the cluster and namespace that NR Broker will update. They must exist before a sync can be queued successfully.

### Authorize services through the graph

Each secret mapping in the sync configuration can reference a **service** by name. Before reading secrets from Vault, Broker verifies that the service is authorized for the target OpenShift project by checking for a `deploys` edge in the graph:

- The OpenShift project has a direct `deploys` edge from the service to it, **or**
- The parent cloud has a `deploys` edge from the service to it.

Add the restricted `deploys` edge in the NR Broker UI or through the API for each service that may be synchronized. The edge can connect the service to the OpenShift Project or to its parent Cloud. These graph steps scope synchronization to specifically authorized services; a service without the edge cannot be used by a mapping. When authorized, the Vault path is built automatically as `tools/<project>/<service>` on the `apps` mount. An optional `path` suffix can be added to read a sub-key within that secret.

> **Note:** Service runtime secrets live under a different path and are accessed by the service's AppRole directly, not via this sync mechanism.
