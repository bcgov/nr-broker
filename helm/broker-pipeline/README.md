# Broker Pipeline charts

## Installing/Upgrading

Ensure you are in this directory.

```
cd helm/broker-pipeline
```

Run install (first time) or upgrade (subsequent times).

```
helm install broker-pipeline .
helm upgrade broker-pipeline .
```
## Running

```oc create -f scripts/pipelinerun-broker-build.yaml```

Then, tag the image for the environments.

```
oc tag nr-broker:latest nr-broker:dev
oc tag nr-broker:latest nr-broker:test
oc tag nr-broker:latest nr-broker:prod
```

## Initial Setup

The tools namespace needed the artifactory secret (artifactory-creds) created and linked to the pipeline service account.

```
oc create secret docker-registry artifactory-creds \
    ...
oc secrets link pipeline artifactory-creds
```

See: https://developer.gov.bc.ca/Developer-Tools/Artifact-Repositories-(Artifactory)#pulling-from-artifactory-in-openshift
