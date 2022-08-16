# Running

oc project a03c8f-tools

```
cd helm/broker-pipeline
helm install broker-pipeline .
helm upgrade broker-pipeline .
```


```oc create -f scripts/pipelinerun-broker-build.yaml```
