#!/usr/bin/env bash

if [ -z BROKER_URL ]
then
  BROKER_URL=http://localhost:3000
fi

curl -X GET $BROKER_URL/v1/health -H 'Content-Type: application/json'
