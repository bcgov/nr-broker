
# NR Broker Development

## Requirements

Required:

* [node](https://nodejs.org) (v20)
* [mongosh](https://www.mongodb.com/docs/mongodb-shell/)
* [podman](https://podman.io)
* [vault](https://www.vaultproject.io)
* [jq](https://jqlang.github.io/jq/)

On macOS, [Homebrew](https://brew.sh) is the suggested way to install and update tools other than node.

```bash
brew tap hashicorp/tap
brew install mongosh podman vault jq
```

Optional:

* [envconsul](https://github.com/hashicorp/envconsul)

```bash
brew install envconsul
```

## Recommended Code Editor

[Visual Studio Code](https://code.visualstudio.com)

### Extensions

* [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template)
* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Setup

### Setup setenv-common.sh

The scripts used to run NR Broker rely on `/scripts/setenv-common.sh` to set the environment varibles locally. A template for [setenv-common.sh](https://github.com/bcgov-nr/nr-broker/blob/main/scripts/setenv-common.sh.tmp) is provided. Copy the template to `/scripts/setenv-common.sh` and modify as needed.

Your team may have a preconfigured environment file. Check with your team.

### Setup OIDC

It is assumed that you have access to an OIDC server. You must configure a client in your OIDC provider for NR Broker. Please setup `http://localhost:3000/*` as a redirect url for your NR Broker client. Copy the client id and secret into your environment file before you start the backend.

Developers may wish to setup thing own client or use the same client as your development server.

### Setup Node

The backend and the ui are separate node projects. You must setup their dependencies before they can be run.

```bash
$ cd api; npm ci
$ cd ui; npm ci
```

### Start infrastructure

From the repository root, start Redis 8 (including Search and JSON), Redis Insight, MongoDB and Vault:

```bash
podman kube play infra.yml
```

Redis Insight is available at http://localhost:5540. Make sure no existing containers use ports 6379, 5540, 27017 or 8200. The setup scripts require the configured `scripts/setenv-common.sh` described above.

After MongoDB and Vault are ready, bootstrap them in this order from the repository root:

```bash
./scripts/mongo-setup.sh
./scripts/vault-setup.sh
```

**Run `./scripts/vault-setup.sh` again after every Vault restart.** Vault runs in development mode and loses its data on restart. MongoDB, Redis and Redis Insight keep their data in named volumes across restarts; rerun MongoDB setup only if its volume is removed.

See: [MongoDB Development](./dev_mongodb.md) and [Vault Development](./dev_vault.md).

## Running Locally

The following assumes the setup steps have occurred and the databases have been successfully bootstrapped.

### Building the UI

```bash
$ cd ui
$ npm run watch
```

The UI should be built before starting the backend server.

### Running the Backend Server

```bash
# Run server in watch mode
# Will source ./scripts/setenv-backend-dev.sh for environment vars
$ cd api
$ npm run watch
```

If you want to do end-to-end testing of the auditing then you can create a copy of `env.hcl` configured to setup the environment with related secrets. The example assumes the copy was called `env-prod.hcl`.

```bash
# Manually source ./scripts/setenv-backend-dev.sh
$ source ./scripts/setenv-backend-dev.sh kinesis

# Watch mode. The env-prod.hcl file is a copy of env.hcl with production values.
$ envconsul -config=env-prod.hcl npm run start:dev
```

If Kinesis and AWS access is not setup then some APIs will return a 503 (service unavailable).

### Local MongoDB Disconnects

The connection to MongoDB may time out if your machine goes to sleep. Simply restart the backend to recover.

### Setting Secrets

The setup script will read the following fields from '[apps/prod/vault/vsync](http://localhost:8200/ui/vault/secrets/apps/kv/prod%2Fvault%2Fvsync/details)' to use as environment variables:

* GITHUB_OAUTH_CLIENT_ID
* GITHUB_OAUTH_CLIENT_SECRET
* GITHUB_SYNC_CLIENT_ID
* GITHUB_SYNC_PRIVATE_KEY

See: [Backend Environment Variables](./dev_env_vars.md)

## API Demonstrations

There are a handful of demonstration curl commands in the scripts folder.

```bash
$ cd scripts
# ENV setup
$ source ./setenv-curl-local.sh
# Health check
$ ./health.sh
# Change directory
$ cd samples
# Demo installation and provision of secret id for application
$ ./provision-app-backend-demo.sh
# Demo direct access of secrets for an activity like liquibase or flyway sync
$ ./provision-app-db-sync-demo.sh
# Demo quickstart and setting of package details with a build
$ ./provision-app-quick-build.sh
# Demo quickstart and attachment of install to build using transaction id
$ ./provision-app-quick-install.sh
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Building Image

The dockerfile can be built locally by running the following.

```bash
podman build . -t nr-broker
```

## Setup Sync Services

Broker can be setup to sync secrets from Vault to other locations. This helps reduce secrets sprawl by ensuring Vault remains the source of truth for your secrets.

### GitHub Sync

GitHub sync requires a GitHub app. It is recommended that the GitHub app be registered under a GitHub organization in production. A GitHub app registered under a personal account can be used for testing. The app requires the following permissions:

* Read and Write: Manage Actions repository secrets.

The app must also be installed in an organization with access to your service repositories.

See:

* https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
* https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app

To locally setup a GitHub App syncing, set the values GITHUB_SYNC_CLIENT_ID and GITHUB_SYNC_PRIVATE_KEY at the Vault path `apps/prod/vault/vsync`.

## Setup User Alias Services

Broker can be setup to allow users to alias their identity in other identity providers to their account.

## Setup Collection Sync from OpenSearch

Broker can synchronize collections with unique names from an OpenSearch index. See: [OpenSearch Integration](./operations_opensearch.md)

### GitHub Alias

GitHub user alias requires a GitHub OAuth app. It is recommended that the GitHub OAuth app be registered under a GitHub organization in production. A GitHub OAuth app registered under a personal account can be used for testing.

See:

* https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

To locally setup a GitHub App syncing, set the values GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET at the Vault path `apps/prod/vault/vsync`.

## Province of British Columbia Palette and Font

The UI defaults to Material's indigo-pink styling. The Angular build configuration 'bcgov' can be combined with an environment configuration to create a build using the BC Government Colour palette and font.

```bash
$ cd ui
$ npm run watch:bcgov
```
