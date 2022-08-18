# Broker secret chart

Helper chart for deploying secrets to environments

Steps
1. Copy values.tpl.yaml to values.yaml
2. Modify values.yaml
3. Deploy


```
helm install broker-secrets .
helm upgrade broker-secrets .
```

## Broker token generation

You will need to create a broker token to complete the values.yaml.

See: [Broker token generator](../../scripts/gen-broker-token.sh)
