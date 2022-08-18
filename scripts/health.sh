#!/bin/bash

cd "${0%/*}"

if [ -z BROKER_URL ]
then
  BROKER_URL=http://localhost:3000
fi

curl -X GET $BROKER_URL/health -H 'Content-Type: application/json'
