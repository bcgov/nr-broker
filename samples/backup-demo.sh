#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open?ttl=30 \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @<(cat backup-intention.json | \
        jq ".event.url=\"http://sample.com/job\" | \
            .user.name=\"hgoddard@idp\" \
        " \
    ))
echo "$BROKER_URL/v1/intention/open:"
echo $RESPONSE | jq '.'
if [ "$(echo $RESPONSE | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    exit 0
fi

# Save intention token for later
INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.token')
# echo "Hashed transaction.id: $(echo -n $INTENTION_TOKEN | shasum -a 256)"

echo "===> Backup files"

# Get token for provisioning a db access
ACTIONS_BACKUP_TOKEN=$(echo $RESPONSE | jq -r '.actions.backup.token')
echo "ACTIONS_BACKUP_TOKEN: $ACTIONS_BACKUP_TOKEN"

# Start backup action
curl -s -X POST $BROKER_URL/v1/intention/action/start -H 'X-Broker-Token: '"$ACTIONS_BACKUP_TOKEN"''

curl -s -X POST $BROKER_URL/v1/intention/action/artifact -H 'X-Broker-Token: '"$ACTIONS_BACKUP_TOKEN"'' \
    -H 'Content-Type: application/json' \
    -d @<(cat backup-artifact.json | \
        jq ".checksum=\"sha256:$(echo $RANDOM $RANDOM $RANDOM | shasum -a 256 | awk '{print $1}')\" | \
            .size=$((RANDOM % 1000000))" \
    )

# End backup action
curl -s -X POST $BROKER_URL/v1/intention/action/end -H 'X-Broker-Token: '"$ACTIONS_BACKUP_TOKEN"''

echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
