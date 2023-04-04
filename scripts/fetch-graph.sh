#!/usr/bin/env bash

curl -s $BROKER_URL/v1/graph/data \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT"
