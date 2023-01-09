#!/usr/bin/env bash

# ./jwt-allocate.sh plate prod oneteam@victoria1.gov.bc.ca client_id
#  $1: license plate
#  $2: environment
#  $3: team email (subject)
#  $4: client_id (optional)

if [ -z "$1" ]
  then
    echo "No license plate supplied"
fi

if [ -z "$2" ]
  then
    echo "No environment supplied"
fi

if [ -z "$3" ]
  then
    echo "No subject supplied"
fi

if [ -n "$1" ] && [ -n "$2" ] && [ -n "$3" ]
  then
  VAULT_ADDR="https://vault-iit.apps.silver.devops.gov.bc.ca"
  VAULT_TOKEN=$(VAULT_ADDR=$VAULT_ADDR vault login -method=oidc -format json -no-store | jq -r '.auth.client_token')

  export JWT_SECRET=$(oc get secret nr-broker-jwt-creds -n $1-$2 -o go-template --template="{{.data.secret|base64decode}}")
  export BROKER_JWT=$(./gen-team-jwt.mjs $3 $4)

  echo "Token: $BROKER_JWT"
  echo "Wrapped token:"
  VAULT_WRAP_JSON=$(echo "{\"environment\": \"$2\", \"token\": \"$BROKER_JWT\"}" | \
    VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault write -format json /sys/wrapping/wrap - | jq '.wrap_info.token')
  echo $VAULT_WRAP_JSON | jq '.'
fi