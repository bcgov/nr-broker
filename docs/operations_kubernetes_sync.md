# Kubernetes / OpenShift Secret Sync

NR Broker can synchronize secrets from Vault into Kubernetes (OpenShift) project secrets. This removes the need to manually copy secrets and keeps them up to date whenever they change in Vault.

## How it works

1. A sync job is enqueued in the Redis queue `kubernetes-sync-secrets` when:
   - Secrets are manually refreshed for an OpenShift project with **Enable secret sync** turned on, or
   - A team, cloud, or broker account that is upstream of an OpenShift project triggers a sync.
2. A cron job runs every 30 seconds and polls the queue. For each dequeued job it:
   - Looks up the OpenShift project record and finds the cloud it belongs to.
   - Reads the sync configuration from the Vault `clouds` KV mount at `<cloud-name>/<project-name>/nr-broker-sync`.
   - Reads each source secret from Vault and writes it into the target namespace.
   - Creates or updates the corresponding Kubernetes `Opaque` Secret in the target namespace using the Kubernetes API.
3. The sync status is recorded on the OpenShift project (`syncSecretsStatus`).

## Authorization via the graph

Each secret mapping in the sync configuration can reference a **service** by name. Before reading secrets from Vault, Broker verifies that the service is authorized for the target OpenShift project by checking for a `deploys` edge in the graph:

- The OpenShift project has a direct `deploys` edge to the service, **or**
- The parent cloud has a `deploys` edge to the service.

This edge must be added in the NR Broker UI (or via the API) before the sync will succeed. The `deploys` edge is a restricted edge and is not followed in graph lookups by default.

When authorized, the Vault path is built automatically as `tools/<project>/<service>` on the `apps` mount, matching the path convention used for all NR Broker–managed services. An optional `path` suffix can be added to read a sub-key within that secret.

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

The sync config lives at `clouds/<cloud-name>/<project-name>/nr-broker-sync`. This walkthrough uses cloud name `local-minikube`:

**Service-based (recommended)** — Broker resolves the Vault path from the graph and verifies the `deploys` edge:

```bash
vault kv put clouds/local-minikube/test-project/nr-broker-sync \
  serviceAccountToken="$SA_TOKEN" \
  caData="$CA_DATA" \
  secrets='[{
    "service": "my-app",
    "destinationSecretName": "my-app-secret"
  }]'
```

**Direct path (legacy)** — Specify the Vault mount and path explicitly:

```bash
vault kv put clouds/local-minikube/test-project/nr-broker-sync \
  serviceAccountToken="$SA_TOKEN" \
  caData="$CA_DATA" \
  secrets='[{
    "sourceMount": "apps",
    "sourcePath": "tools/my-project/my-app",
    "destinationSecretName": "my-app-secret"
  }]'
```

#### `nr-broker-sync` configuration fields

| Field | Required | Description |
| --- | --- | --- |
| `serviceAccountToken` | Yes | Bearer token for the service account created in step 3 |
| `caData` | No | Base64-encoded CA certificate for the API server. Required for minikube's self-signed cert. |
| `secrets` | Yes | JSON array of secret mapping objects (see below) |

#### Secret mapping fields

Each entry in the `secrets` array maps one Vault path to one Kubernetes Secret. Use either the service-based fields or the legacy direct-path fields:

| Field | Required | Description |
| --- | --- | --- |
| `service` | One of `service` or `sourceMount`+`sourcePath` | Name of the service in the graph. Broker verifies a `deploys` edge exists from the OpenShift project or cloud to this service and builds the path `tools/<project>/<service>` automatically. |
| `path` | No | Sub-path appended to `tools/<project>/<service>/` when using the `service` field. |
| `sourceMount` | One of `service` or `sourceMount`+`sourcePath` | Vault KV mount for the source secret (e.g. `apps`). |
| `sourcePath` | One of `service` or `sourceMount`+`sourcePath` | Path within the mount (e.g. `tools/my-project/my-app`). |
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

**Example with key mapping (legacy):**

```json
{
  "sourceMount": "apps",
  "sourcePath": "tools/my-project/my-app",
  "destinationSecretName": "my-app-secret",
  "keyMapping": {
    "MY_SECRET_KEY": "APP_SECRET"
  }
}
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

The local Vault is in dev mode so the root token has all access — no policy changes are needed for local testing.

For a non-dev Vault, add a policy to the Broker Token:

```hcl
path "clouds/data/+/+/nr-broker-sync" {
  capabilities = ["read"]
}

path "apps/data/tools/+/+" {
  capabilities = ["read"]
}
```

See: [Broker Token](/dev_broker_token.md)

### 10. Trigger and verify the sync

Trigger a sync from the NR Broker UI on the OpenShift Project page using the **Sync secrets** action, then verify the secret appeared in minikube:

```bash
kubectl get secret my-app-secret -n test-project -o jsonpath='{.data}' | jq .
# {"MY_SECRET_KEY":"aGVsbG8tZnJvbS12YXVsdA=="}

# Decode a value
kubectl get secret my-app-secret -n test-project \
  -o jsonpath='{.data.MY_SECRET_KEY}' | base64 --decode
# hello-from-vault
```

The sync runs automatically every 30 seconds once queued, so the secret will also appear on the next cron cycle without a manual trigger.

## Monitoring sync status

The `syncSecretsStatus` field on the OpenShift Project record tracks:

- `queuedAt` — when the job was last enqueued
- `syncAt` — when the last sync completed successfully

These are visible in the NR Broker UI on the OpenShift Project detail page (requires `sudo` access).

Sync activity is recorded in the audit log with the `tools.sync` dataset. See: [Understanding the Audit Log](/operations_audit.md)

## Upgrading an existing installation

If you are adding Kubernetes sync to an existing NR Broker installation that did not have Cloud and OpenShift Project collections, run the following migration scripts in order:

```bash
# Add Cloud and OpenShift Project collection configs
mongosh -u <user> -p <password> --authenticationDatabase admin brokerDB \
  ./scripts/db/mongo-migration-add-cloud-openshift.js

# Add KUBERNETES_SYNC_SECRETS sync queue config and update collection sync rules
mongosh -u <user> -p <password> --authenticationDatabase admin brokerDB \
  ./scripts/db/mongo-migration-add-sync-queues-to-collection-config.js
```

Both scripts are idempotent and safe to run on an already-migrated database.
