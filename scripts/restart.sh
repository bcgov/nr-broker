#!/usr/bin/env bash

podman stop broker-mongo broker-vault broker-redis
podman start broker-mongo broker-vault broker-redis
./vault-setup.sh
