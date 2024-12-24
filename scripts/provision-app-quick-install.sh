#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

BUILD_INTENTION="$(cat provision-app-quick-build.intention.id)"
echo $BUILD_INTENTION

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open?ttl=30\&quickstart=true \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @<(cat provision-app-quick-install.json | \
        jq ".event.url=\"http://sample.com/job\" | \
            .user.name=\"hgoddard@idp\" | \
            (.actions[] | select(.id == \"install\") .source.intention) |= \"$BUILD_INTENTION\" \
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

echo "===> Patch 1"
# Add install to action
ACTIONS_INSTALL_TOKEN=$(echo $RESPONSE | jq -r '.actions.install.token')
curl -s -X POST $BROKER_URL/v1/intention/action/patch \
        -H 'Content-Type: application/json' \
        -H 'X-Broker-Token: '"$ACTIONS_INSTALL_TOKEN"'' \
        -d '{"cloud":{"target":{"propStrategy":"replace","prop":{"port": "5000", "something": "else"}}}}'

echo ""
echo "===> Patch 2"
ACTIONS_INSTALL_TOKEN=$(echo $RESPONSE | jq -r '.actions.install.token')
curl -s -X POST $BROKER_URL/v1/intention/action/patch \
        -H 'Content-Type: application/json' \
        -H 'X-Broker-Token: '"$ACTIONS_INSTALL_TOKEN"'' \
        -d '{"cloud":{"target":{"propStrategy":"replace","prop":{"java_version": "8"}}}}'

echo ""
echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
