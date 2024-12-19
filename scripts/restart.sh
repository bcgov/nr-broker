#!/usr/bin/env bash

podman stop broker-mongo broker-vault broker-redis
podman start broker-mongo broker-vault broker-redis

echo "Waiting for containers to start..."
sleep 1

. ${0%/*}/vault-setup.sh
