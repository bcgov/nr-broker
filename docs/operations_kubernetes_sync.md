# Kubernetes / OpenShift Secret Sync

NR Broker can synchronize **tools (CI/CD) secrets** from Vault into Kubernetes (OpenShift) project secrets. This is intended for secrets that CI/CD pipelines and build tooling need — such as Broker account tokens and other infrastructure credentials — not for runtime application secrets.

For runtime service secrets, applications should authenticate using their [service AppRole](/dev_vault_for_developers.md) to read secrets directly from Vault.

For general information about how the collection sync system works, see [Collection Sync Queues](/dev_customize_collection_sync.md).

## How it works

1. A sync job is enqueued in the Redis queue `kubernetes-sync-secrets` when:
  - Secrets are manually refreshed for an OpenShift project with **Enable secret sync** turned on, or
  - A team, cloud, or broker account (configured collections may vary) that is upstream of an OpenShift project triggers a sync.
2. A cron job runs every 30 seconds and polls the queue. For each dequeued job it:
  - Looks up the OpenShift project record and finds the cloud it belongs to.
  - Reads the sync configuration from the Vault `clouds` KV mount at `<cloud-name>/<project-name>/nr-broker-sync`.
  - Reads each source secret from Vault and writes it into the target namespace.
   - Creates or fully replaces the corresponding Kubernetes `Opaque` Secret in the target namespace using the Kubernetes API, and labels it as managed by NR Broker.
3. The sync status is recorded on the OpenShift project (`syncSecretsStatus`).

## Authorization via the graph

Each secret mapping in the sync configuration can reference a **service** by name. Before reading secrets from Vault, Broker verifies that the service is authorized for the target OpenShift project by checking for a `deploys` edge in the graph:

- The OpenShift project has a direct `deploys` edge from the service to it, **or**
- The parent cloud has a `deploys` edge from the service to it.

This edge must be added in the NR Broker UI (or via the API) before the sync will succeed. The `deploys` edge is a restricted edge and is not followed in graph lookups by default.

When authorized, the Vault path is built automatically as `tools/<project>/<service>` on the `apps` mount — the path convention for tools (CI/CD) secrets in NR Broker. An optional `path` suffix can be added to read a sub-key within that secret.

> **Note:** Service runtime secrets live under a different path and are accessed by the service's AppRole directly, not via this sync mechanism.

## Configuring sync

This section describes how to set up secret sync for a project. The sync configuration is stored in Vault at `clouds/<cloud-name>/<project-name>/nr-broker-sync`. Broker reads this configuration each time a sync job runs.

### Writing the configuration

Broker resolves the Vault path from the graph and verifies the `deploys` edge:

```bash
vault kv put clouds/<cloud-name>/<project-name>/nr-broker-sync \
  serviceAccountToken="<service-account-token>" \
  caData="<base64-ca-cert>" \
  secrets='[{
     "service": "<service-name>",
     "destinationSecretName": "<secret-name>"
   }]'
```

#### `nr-broker-sync` configuration fields

| Field | Required | Description |
| --- | --- | --- |
| `serviceAccountToken` | Yes | Bearer token for the Kubernetes service account with `secrets` permissions. |
| `caData` | No | Base64-encoded CA certificate for the API server. Required for clusters with a self-signed cert (such as minikube). |
| `rejectNonCompliantKeys` | No | When `true`, sync fails if any source or mapped key cannot be made DNS-1123 compliant. When omitted or `false` (the default), non-compliant keys are automatically rewritten to a DNS-1123 compliant form. See [Secret key normalization](#secret-key-normalization). |
| `secrets` | Yes | JSON array of secret mapping objects (see below) |

#### Secret mapping fields

Each entry in the `secrets` array maps one Vault path to one Kubernetes Secret:

| Field | Required | Description |
| --- | --- | --- |
| `service` | Yes | Name of the service in the graph. Broker verifies a `deploys` edge exists from the OpenShift project or cloud to this service and builds the path `tools/<project>/<service>` automatically. |
| `path` | No | Sub-path appended to `tools/<project>/<service>/` when using the `service` field. |
| `destinationSecretName` | Yes | Name of the Kubernetes Secret to create or update in the namespace. |
| `keyMapping` | No | Object mapping source key names to destination key names. Keys not listed are copied unchanged. |

**Example with service and optional sub-path:**

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

To prevent silent rewriting, set `rejectNonCompliantKeys: true` in the `nr-broker-sync` configuration. With this option the sync fails the affected mapping when a key is not already DNS-1123 compliant, instead of rewriting it. This is useful when the consuming application expects exact key names.

```bash
vault kv put clouds/<cloud-name>/<project-name>/nr-broker-sync \
  serviceAccountToken="<service-account-token>" \
  rejectNonCompliantKeys="true" \
  secrets='[{"service": "my-app", "destinationSecretName": "my-app-credentials"}]'
```

## Managed secrets label

Every secret that Broker creates or updates is labeled `nr-broker.io/managed-by=nr-broker`, so managed secrets can be identified and selected (for example with `kubectl get secrets -l nr-broker.io/managed-by=nr-broker`).

When a managed secret already exists, Broker **replaces it in full** with the freshly computed data on each sync. This is the intended behaviour: the managed secret always reflects the current source in Vault. Keys that are no longer present in the source are removed, and keys that are no longer managed by Broker are not touched.

## Testing locally with minikube

The steps below walk through an end-to-end local test using [minikube](https://minikube.sigs.k8s.io/) alongside the standard NR Broker local dev stack (Podman, Vault, MongoDB, Redis). Complete the [local dev setup](/development.md) first.

### Additional requirements

- [minikube](https://minikube.sigs.k8s.io/docs/start/) — local Kubernetes cluster
- [kubectl](https://kubernetes.io/docs/tasks/tools/) — Kubernetes CLI

On macOS:

```bash
brew install minikube kubectl
```

### 1. Start minikube

```bash
minikube start
```

Confirm it is running and note the API server URL:

```bash
kubectl cluster-info
# Kubernetes control plane is running at https://127.0.0.1:<port>
```

Record that URL — it becomes the **API URL** for the Cloud record in step 4.

### 2. Create a test namespace

The namespace name must match the OpenShift project name you register in NR Broker. This walkthrough uses `test-project`.

```bash
kubectl create namespace test-project
```

### 3. Create a service account and RBAC

NR Broker uses a service account bearer token to authenticate with the Kubernetes API. Create one with the minimum permissions needed to manage Secrets:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nr-broker-sync
  namespace: test-project
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: nr-broker-sync
  namespace: test-project
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: nr-broker-sync
  namespace: test-project
subjects:
  - kind: ServiceAccount
    name: nr-broker-sync
    namespace: test-project
roleRef:
  kind: Role
  apiGroup: rbac.authorization.k8s.io
  name: nr-broker-sync
EOF
```

Create a long-lived token secret for the service account (Kubernetes 1.24+):

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: nr-broker-sync-token
  namespace: test-project
  annotations:
    kubernetes.io/service-account.name: nr-broker-sync
type: kubernetes.io/service-account-token
EOF
```

Extract the token and the CA certificate:

```bash
SA_TOKEN=$(kubectl get secret nr-broker-sync-token -n test-project \
  -o jsonpath='{.data.token}' | base64 --decode)

CA_DATA=$(kubectl get secret nr-broker-sync-token -n test-project \
  -o jsonpath='{.data.ca\.crt}')

echo "SA_TOKEN: $SA_TOKEN"
echo "CA_DATA:  $CA_DATA"
```

### 4. Put a source secret in Vault

The local Vault dev server is already running at `http://localhost:8200` (token `myroot`). Write a dummy source secret that the sync will copy into minikube:

```bash
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=myroot

vault kv put apps/tools/my-project/my-app \
  MY_SECRET_KEY="hello-from-vault"
```

### 5. Link the service to the cloud in NR Broker

Create a **Cloud** record, an **OpenShift Project** record, and the **Service** record for `my-app` in NR Broker if they do not already exist. Then add a `deploys` edge from the Cloud (or the OpenShift Project) to the Service in the graph UI. This edge authorizes secret sync for that service.

See step 6 and 7 below for the Cloud and OpenShift Project setup.

### 6. Write the sync configuration to Vault

Write the configuration for the `local-minikube` cloud and `test-project` project, following the field definitions in [Configuring sync](#configuring-sync):

```bash
vault kv put clouds/local-minikube/test-project/nr-broker-sync \
  serviceAccountToken="$SA_TOKEN" \
  caData="$CA_DATA" \
  secrets='[{
      "service": "my-app",
```

### 7. Register a Cloud record in NR Broker

In the NR Broker UI, create a **Cloud** record:

| Field | Value for local test |
| --- | --- |
| Name | `local-minikube` |
| Type | `openshift` |
| API URL | The URL from `kubectl cluster-info` (e.g. `https://127.0.0.1:49876`) |
| Console URL | (optional) |
| Cluster name | (optional) |

Link the cloud to a **Team** via the `operates` edge.

### 8. Register an OpenShift Project record

Create an **OpenShift Project** record linked to the `local-minikube` cloud via a `project` edge:

| Field | Value for local test |
| --- | --- |
| Name | `test-project` (must match the Kubernetes namespace) |
| Display Name | `Test Project` |
| Enable secret sync | `true` |

### 9. Grant the local Broker Token access to the `clouds` mount

The local Vault is in dev mode so the root token has all access — no policy changes are needed for local testing. For a non-dev Vault, add the policy described in [Granting the Broker Token access to the `clouds` mount](#granting-the-broker-token-access-to-the-clouds-mount).

### 10. Trigger and verify the sync

Trigger a sync from the NR Broker UI on the OpenShift Project page using the **Sync secrets** action, then verify the secret appeared in minikube:

```bash
kubectl get secret my-app-secret -n test-project -o jsonpath='{.data}' | jq .
# {"my_secret_key":"aGVsbG8tZnJvbS12YXVsdA=="}

# Decode a value. Note the source key MY_SECRET_KEY is normalized to my_secret_key.
kubectl get secret my-app-secret -n test-project \
  -o jsonpath='{.data.my_secret_key}' | base64 --decode
# hello-from-vault

# Confirm the managed-by label was applied
kubectl get secret my-app-secret -n test-project \
  -o jsonpath='{.metadata.labels}' | jq .
# {"nr-broker.io/managed-by":"nr-broker"}
```

The sync runs automatically every 30 seconds once queued, so the secret will also appear on the next cron cycle without a manual trigger.

### Granting the Broker Token access to the `clouds` mount

Broker Vault Token needs read access to both the `clouds` mount (where the sync config lives) and the source secret path. Add this policy to the Broker Vault Token:

```hcl
path "clouds/data/+/+/nr-broker-sync" {
  capabilities = ["read"]
}

path "apps/data/tools/+/+" {
  capabilities = ["read"]
}
```
