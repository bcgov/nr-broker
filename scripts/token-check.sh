#!/usr/bin/env bash

if [ -z BROKER_URL ]
then
  BROKER_URL=http://localhost:3000
fi
echo -n "Status: "
curl -s -w "%{http_code}\n" -X GET $BROKER_URL/v1/health/token-check \
    -H "Authorization: Bearer $BROKER_JWT"
