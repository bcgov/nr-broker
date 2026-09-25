# Kubernetes / OpenShift Secret Sync Development

This guide describes the sync flow, API integration, and local testing for Kubernetes / OpenShift secret sync. Complete the [local dev setup](/development.md) before following the local cluster steps.

For authorization, key normalization, managed-secret behavior, and Broker Vault access policy, see [Kubernetes / OpenShift Secret Sync](/operations_kubernetes_sync.md).

## Sync reference

### How it works

1. A collection sync request resolves the affected OpenShift Projects from the configured graph traversal. Team and Cloud sync configuration can include the `KUBERNETES_SYNC_SECRETS` queue.
2. NR Broker enqueues each eligible OpenShift Project ID in the BullMQ queue `kubernetes-sync-secrets`. Repeated requests for the same project are debounced for five seconds.
3. A worker consumes the queue job, finds the project's upstream Cloud, and reads the configuration from the Vault `clouds` KV mount at `<cloud-name>/<project-name>/nr-broker-sync`.
4. For each mapping, Broker verifies the service authorization, reads the source from the Vault `apps` mount, and creates or fully replaces a Kubernetes `Opaque` Secret in the project's namespace. The secret is labeled as managed by NR Broker.
5. The sync status is recorded on the OpenShift Project (`syncSecretsStatus`) after all mappings succeed. A missing project, Cloud, configuration, or failed mapping records a failure instead.

The queue worker is part of the API process unless queue processing is configured separately. This is queue-driven processing, not a fixed cron poll.

### Triggering sync through the API

The UI's **Sync secrets** action uses the collection sync API. An administrator or collection owner with the required permission can trigger the Kubernetes queue directly for an OpenShift Project:

```bash
curl --request POST \
  "https://broker.example.com/api/collection/openshiftProject/<project-id>/sync?queue=KUBERNETES_SYNC_SECRETS" \
  --header "Authorization: Bearer <broker-oidc-token>"
```

To trigger the configured Kubernetes sync targets from a Team or Cloud, use the same endpoint with that collection and `type=secrets`:

```bash
curl --request POST \
  "https://broker.example.com/api/collection/cloud/<cloud-id>/sync?type=secrets" \
  --header "Authorization: Bearer <broker-oidc-token>"
```

The request queues the work; it does not wait for the Kubernetes API operation to finish. Check `syncSecretsStatus` on the OpenShift Project or the audit log for the result.

## Local development test

### Requirements

- [minikube](https://minikube.sigs.k8s.io/docs/start/) — local Kubernetes cluster
- [kubectl](https://kubernetes.io/docs/tasks/tools/) — Kubernetes CLI
- [oc](https://mirror.openshift.com/pub/openshift-v4/clients/ocp/) — optional OpenShift CLI

On macOS:

```bash
brew install minikube kubectl
```

Install `oc` separately if you want to use the OpenShift CLI examples.

### Start minikube

```bash
minikube start
kubectl cluster-info
```

Use the Kubernetes control plane URL returned by `kubectl cluster-info` as the Cloud record's API URL.

### Create a namespace

The namespace must match the OpenShift Project name registered in NR Broker. Set it once and use it throughout this guide:

```bash
export PROJECT_NAME=<project-name>
export SERVICE_ACCOUNT_NAME=nr-broker-sync

kubectl create namespace "$PROJECT_NAME"
```

With the OpenShift CLI, the equivalent command is:

```bash
oc create namespace "$PROJECT_NAME"
```

### Create the service account and RBAC

NR Broker needs a service account with permission to manage Secrets in the target namespace.

### kubectl

```bash
kubectl create serviceaccount "$SERVICE_ACCOUNT_NAME" --namespace "$PROJECT_NAME"
kubectl create role "$SERVICE_ACCOUNT_NAME" \
  --namespace "$PROJECT_NAME" \
  --verb=get --verb=create --verb=update --verb=patch \
  --resource=secrets
kubectl create rolebinding "$SERVICE_ACCOUNT_NAME" \
  --namespace "$PROJECT_NAME" \
  --role="$SERVICE_ACCOUNT_NAME" \
  --serviceaccount="$PROJECT_NAME:$SERVICE_ACCOUNT_NAME"
```

### oc

```bash
oc create serviceaccount "$SERVICE_ACCOUNT_NAME" --namespace "$PROJECT_NAME"
oc create role "$SERVICE_ACCOUNT_NAME" \
  --namespace "$PROJECT_NAME" \
  --verb=get --verb=create --verb=update --verb=patch \
  --resource=secrets
oc create rolebinding "$SERVICE_ACCOUNT_NAME" \
  --namespace "$PROJECT_NAME" \
  --role="$SERVICE_ACCOUNT_NAME" \
  --serviceaccount="$PROJECT_NAME:$SERVICE_ACCOUNT_NAME"
```

Create a long-lived token for local testing. OpenShift provides the requested token command directly:

```bash
SA_TOKEN=$(oc create token "$SERVICE_ACCOUNT_NAME" \
  --namespace "$PROJECT_NAME" \
  --duration=87600h)
```

On Kubernetes 1.24+, create a service-account token Secret and read its token and CA data:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ${SERVICE_ACCOUNT_NAME}-token
  namespace: ${PROJECT_NAME}
  annotations:
    kubernetes.io/service-account.name: ${SERVICE_ACCOUNT_NAME}
type: kubernetes.io/service-account-token
EOF

SA_TOKEN=$(kubectl get secret "${SERVICE_ACCOUNT_NAME}-token" \
  --namespace "$PROJECT_NAME" \
  -o jsonpath='{.data.token}' | base64 --decode)
CA_DATA=$(kubectl get secret "${SERVICE_ACCOUNT_NAME}-token" \
  --namespace "$PROJECT_NAME" \
  -o jsonpath='{.data.ca\.crt}')
```

For an OpenShift cluster, `oc create token` returns a token but does not provide `caData`. Obtain CA data from the cluster configuration if the API server uses a self-signed certificate.

### Put a source secret in Vault

The local Vault dev server runs at `http://localhost:8200` with token `myroot`:

```bash
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=myroot

vault kv put apps/tools/$PROJECT_NAME/my-app \
  MY_SECRET_KEY="hello-from-vault"
```

### Register and authorize the project

Ask an NR Broker administrator to create or confirm the following records:

1. A **Cloud** with type `openshift`, the minikube API URL, and a name matching the Vault path below.
2. An **OpenShift Project** linked to the Cloud with a name matching `$PROJECT_NAME` and **Enable secret sync** turned on.
3. A **Service** named `my-app`.
4. A team attached to the `my-app` Service, with the developer assigned to that team.
5. A `deploys` edge from the Cloud or OpenShift Project to the Service.

The team assignment provides the developer's access to the service. The `deploys` edge authorizes the service's tools secret for this project.

### Configure the sync mapping

Configure the project in Vault using the [sync mapping reference](/operations_kubernetes_sync.md#configure-the-sync-mapping). The `serviceAccountToken` is the token for the service account created above.

### Grant the Broker token access to Vault

The Broker Vault token needs read access to both the `clouds` mount, where the sync configuration lives, and the source secret path. An administrator who manages the Broker Vault token can add this policy:

```hcl
path "clouds/data/+/+/nr-broker-sync" {
  capabilities = ["read"]
}

path "apps/data/tools/+/+" {
  capabilities = ["read"]
}
```

### Verify the sync

Trigger the sync from the NR Broker UI or by following the API examples above. The request queues the work; verify the result after the queue worker processes it:

```bash
kubectl get secret my-app-secret --namespace "$PROJECT_NAME" -o jsonpath='{.data}' | jq .
kubectl get secret my-app-secret --namespace "$PROJECT_NAME" \
  -o jsonpath='{.data.my_secret_key}' | base64 --decode
kubectl get secret my-app-secret --namespace "$PROJECT_NAME" \
  -o jsonpath='{.metadata.labels}' | jq .
```

The source key `MY_SECRET_KEY` is normalized to `my_secret_key`, and the managed secret has the label `nr-broker.io/managed-by=nr-broker`.

### Remove the local test resources

Delete the NR Broker Cloud, OpenShift Project, Service, and graph edge when they are no longer needed. Then remove the Vault entries and Kubernetes resources:

```bash
vault kv delete clouds/<cloud-name>/$PROJECT_NAME/nr-broker-sync
vault kv delete apps/tools/$PROJECT_NAME/my-app

kubectl delete rolebinding "$SERVICE_ACCOUNT_NAME" --namespace "$PROJECT_NAME"
kubectl delete role "$SERVICE_ACCOUNT_NAME" --namespace "$PROJECT_NAME"
kubectl delete serviceaccount "$SERVICE_ACCOUNT_NAME" --namespace "$PROJECT_NAME"
kubectl delete namespace "$PROJECT_NAME"
minikube stop
```

Use the same resource names with `oc delete` when working against an OpenShift cluster.
