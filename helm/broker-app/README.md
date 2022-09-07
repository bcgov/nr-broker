# Broker app chart

## Installing/Upgrading

Ensure you are in this directory.

```
cd helm/broker-app
```

Run install (first time) or upgrade (subsequent times).

```
helm install -f values/<env>.yaml broker-app .
helm upgrade -f values/<env>.yaml broker-app .
```

## Deploying a new app version

The recommended route is to update the appVersion in Chart.yaml and use `helm upgrade`.

### Deploying a specific version

A rollout of a new version can be triggered by tagging a container manually. This is not recommended.

```
oc tag -n a03c8f-dev artifacts.developer.gov.bc.ca/ba03-docker-local/bcgov-nr/nr-broker-backend:vx.x.x nr-broker:latest
oc tag -n a03c8f-test artifacts.developer.gov.bc.ca/ba03-docker-local/bcgov-nr/nr-broker-backend:vx.x.x nr-broker:latest
oc tag -n a03c8f-prodartifacts.developer.gov.bc.ca/ba03-docker-local/bcgov-nr/nr-broker-backend:vx.x.x nr-broker:latest
```

## Initial Setup

Run the [secret chart](../broker-secrets/README.md) first.


