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

## Initial Setup

Run the [secret chart](../broker-secrets/README.md) first


