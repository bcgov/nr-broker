# Broker Pipeline chart

## Installing/Upgrading

Ensure you are in this directory.

```
cd helm/broker-tools
```

Run install (first time) or upgrade (subsequent times).

```
helm install broker-tools .
helm upgrade broker-tools .
```

## Initial Setup

The tools namespace needed the artifactory secret (artifactory-creds) created and linked to the pipeline service account.

```
oc create secret docker-registry artifactory-creds \
    ...
oc secrets link pipeline artifactory-creds
```

See: https://developer.gov.bc.ca/Developer-Tools/Artifact-Repositories-(Artifactory)#pulling-from-artifactory-in-openshift
