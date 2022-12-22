#!/usr/bin/env bash

# Precondition: Logged into Openshift as admin prior to running this script

if [ -z "$1" ]
  then
    echo "No environment supplied"
fi

if [ -n "$1" ]
  then
  new_token=$(./gen-fluentbit-token.sh $1 | base64)

  echo "Refreshing: $1"

  old_token=`oc -n a03c8f-$1 get secrets vault -o json | jq -r ".data[\"vault-token\"]"`

  echo "Old token: $old_token"
  echo "New token: $new_token"

  oc -n a03c8f-$1 get secrets vault -o json | jq ".data[\"vault-token\"] |= \"$new_token\"" | oc -n a03c8f-$1 apply -f -
  oc -n a03c8f-$1 rollout restart statefulset nr-broker-app
fi