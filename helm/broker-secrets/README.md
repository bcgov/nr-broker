Helper chart for deploying secrets to environments

Steps
. Copy values.tpl.yaml to values.yaml
. Modify values.yaml
. Deploy

Broker token generator: ../../scripts/gen-broker-token.sh

```
helm install broker-secrets .
helm upgrade broker-secrets .
```