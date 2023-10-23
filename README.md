# NR Broker

NR Broker handles the business logic of authenticating and validating requests for automated processes to access secrets.

NR Broker is built using the [Nest](https://github.com/nestjs/nest) framework.

## Development requirements

The following are expected to be installed.

* node (v20)
* mongosh
* podman
* vault

## Development Setup

### Setup setenv-common.sh

The other scripts rely on `./scripts/setenv-common.sh` to set their environment varibles. A template for [setenv-common.sh](./scripts/setenv-common.sh.tmp) is provided.

Your team may have built one customized for the deployment. The template or your team's custom version needs to be copied to `./scripts/setenv-common.sh`.

### Setup OIDC

It is assumed that you have access to an OIDC server. You must configure your client id and secret in the setenv file to run the backend. Please setup `http://localhost:3000/*` as a redirect url for your client. Developers may wish to setup thing own client or use the same client as your development server.

### Setup Node

The backend and the ui are separate node projects. You must setup their dependencies before they can be run.

```bash
$ npm ci
$ cd ui; npm ci
```

### Setup MongoDB

The development setup assumes you are using podman to run MongoDB.

```bash
# Start up local MongoDB
$ podman run \
  -p 27017:27017 \
  --name broker-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=mongoadmin \
	-e MONGO_INITDB_ROOT_PASSWORD=secret \
  -d mongo:6 \
  --wiredTigerCacheSizeGB 0.25
```

Once started, you must use the MongoDB setup script to bootstrap the database.

```bash
# Configure the local MongoDB with basic setup
$ ./scripts/mongo-setup.sh
```

### Setup Vault

```bash
# Start up local vault
$ podman run -p 8200:8200 --cap-add=IPC_LOCK -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' -d --name=broker-vault hashicorp/vault
```

Once started, you must run the vault setup script to bootstrap it. MongoDB must be running and setup before running this.

```
# Configure the local vault with basic setup
$ ./scripts/vault-setup.sh
```

## Running Locally

The following assumes the setup steps have occurred and the databases have been successfully bootstrapped.

### Building the UI

```bash
$ cd ui
$ npm run watch
```

The UI should be built before starting the backend server.

### Running the backend server

```bash
# Run server in watch mode
# Will source ./scripts/setenv-backend-dev.sh for environment vars
$ npm run watch
```

If you want to do end-to-end testing of the auditing then you need to request the Fluentbit token from your production vault and start the server using envconsul.

```bash
# Manually source ./scripts/setenv-backend-dev.sh
$ source ./scripts/setenv-backend-dev.sh kinesis

# Watch mode. The env-prod.hcl file is a copy of env.hcl with production values.
$ envconsul -config=env-prod.hcl npm run start:dev
```

## Connect to MongoDB

```
mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB
```

### Wiping the graph database

If at any time you need to wipe the graph database, you can drop the tables by using mongosh and then reinstall.

```
brokerDB> db.service.drop(); db.vertex.drop(); db.edge.drop(); db.project.drop(); db.environment.drop(); db.serviceInstance.drop();
```

### Updating JWT allow/block list

The JWT allow and block lists are stored in the collections jwtAllow and jwtBlock, respectively. The lists allow you to filter on the cliams 'jti', 'sub' and 'client_id'. Allowing or blocking is specified by adding a document to the associated collection with any, all or none of those cliams specified. Keys that are not present are considered to match. This means you can allow (or block) all JWTs by adding an empty object. An allow document of `{"sub":"cool@person.tv"}` means all JWT cliams with a sub matching "cool@person.tv" will be allowed. If you add a JTI key/value as well then both the JTI and sub will need to match. The block list works similarly.

## API demonstrations

There are a handful of demonstration curl commands in the scripts folder.

```bash
$ cd scripts
# ENV setup
$ source ./setenv-curl-local.sh
# Health check
$ ./health.sh
# Demo installation and provision of secret id for application
$ ./provision-app-backend-demo.sh
# Demo direct access of secrets for an activity like liquibase or flyway sync
$ ./provision-app-db-sync-demo.sh
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

## Building image

The dockerfile can be built locally by setting the REPO_LOCATION.

`podman build . -t nr-broker`

## Built with NestJS

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# License

See: [LICENSE](./LICENSE)
