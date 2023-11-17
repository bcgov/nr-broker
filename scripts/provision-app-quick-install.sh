#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

BUILD_CHECKSUM="sha256:$(cat provision-app-quick-build.artifact.sha256)"
echo $BUILD_CHECKSUM

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open?ttl=30\&quickstart=true \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @<(cat provision-app-quick-install.json | \
        jq ".event.url=\"http://sample.com/job\" | \
            .user.name=\"hgoddard@idp\" | \
            (.actions[] | select(.id == \"install\") .package.checksum) |= \"$BUILD_CHECKSUM\" \
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

echo "===> Install"

# Not shown: Install superapp
echo "===> ..."
echo "===> Install - Success!"
echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
