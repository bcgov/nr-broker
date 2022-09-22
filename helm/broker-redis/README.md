# Redis installation

See: https://github.com/bitnami/charts/tree/master/bitnami/redis/#installing-the-chart

The values.yaml file is necessary to correctly install on OpenShift.

```
helm install redis -f values.yaml bitnami/redis
helm upgrade redis -f values.yaml bitnami/redis
helm delete redis
```
