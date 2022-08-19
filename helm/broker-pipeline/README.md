# Broker Pipeline chart

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

To deploy:

```
oc tag -n a03c8f-dev a03c8f-tools/nr-broker:dev nr-broker:latest
oc tag -n a03c8f-test a03c8f-tools/nr-broker:test nr-broker:latest
oc tag -n a03c8f-prod a03c8f-tools/nr-broker:prod nr-broker:latest
```

## Initial Setup

The tools namespace needed the artifactory secret (artifactory-creds) created and linked to the pipeline service account.

```
oc create secret docker-registry artifactory-creds \
    ...
oc secrets link pipeline artifactory-creds
```

See: https://developer.gov.bc.ca/Developer-Tools/Artifact-Repositories-(Artifactory)#pulling-from-artifactory-in-openshift
