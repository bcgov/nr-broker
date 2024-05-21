
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
brew install mongosh podman vault jq
```

Optional:

* [envconsul](https://github.com/hashicorp/envconsul)

```bash
brew install envconsul
```

## Setup

### Setup setenv-common.sh

The scripts used to run NR Broker rely on `./scripts/setenv-common.sh` to set the environment varibles locally. A template for [setenv-common.sh](https://github.com/bcgov-nr/nr-broker/blob/main/scripts/setenv-common.sh.tmp) is provided. Copy the template to `./scripts/setenv-common.sh` and modify as needed.

Your team may have a preconfigured environment file. Check with your team.

### Setup OIDC

It is assumed that you have access to an OIDC server. You must configure a client in your OIDC provider for NR Broker. Please setup `http://localhost:3000/*` as a redirect url for your NR Broker client. Copy the client id and secret into your environment file before you start the backend.

Developers may wish to setup thing own client or use the same client as your development server.

### Setup Node

The backend and the ui are separate node projects. You must setup their dependencies before they can be run.

```bash
$ npm ci
$ cd ui; npm ci
```

 ### Setup redis-stack

The development setup assumes you are using podman to run the Redis Stack.

 ```bash
 # Start up local redis stack
 $ podman run -p 6379:6379 -p 8001:8001 --name broker-redis -d redis/redis-stack
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
  -d mongo:7 \
  --wiredTigerCacheSizeGB 0.25
```

Once started, you must use the MongoDB setup script to bootstrap the database. If you encounter an error here, it is likely you are missing a required tool or need an environment file.

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

```bash
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

If you want to do end-to-end testing of the auditing then you can create a copy of `env.hcl` configured to setup the environment with related secrets. The example assumes the copy was called `env-prod.hcl`.

```bash
# Manually source ./scripts/setenv-backend-dev.sh
$ source ./scripts/setenv-backend-dev.sh kinesis

# Watch mode. The env-prod.hcl file is a copy of env.hcl with production values.
$ envconsul -config=env-prod.hcl npm run start:dev
```

## Connect to MongoDB

```bash
mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB
```

### Wiping the graph database

If at any time you need to wipe the graph database, you can drop the tables by using mongosh and then reinstall.

```
brokerDB> db.service.drop(); db.vertex.drop(); db.edge.drop(); db.project.drop(); db.environment.drop(); db.serviceInstance.drop();
```

### Restoring a database from a dump

If you have an existing database, connect to it and delete it first.

```
brokerDB> db.dropDatabase()
```

Run the following. Alter the path to dump taken with mongodump as needed. The important thing is that you want to overwrite the broker database (brokerDB) and not the authentication database.

```
mongorestore --host=localhost:27017 --authenticationDatabase=admin -u=mongoadmin -p=secret --db=brokerDB *path/to/backup*/brokerDB
```

If you want to use the samples in the scripts folder, you may need to alter the user value sent and the team ids (admin and DBA) in [setenv-backend-dev.sh](scripts/setenv-backend-dev.sh).


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

## Building image

The dockerfile can be built locally by running the following.

```bash
podman build . -t nr-broker
```

## Province of British Columbia Palette and Font

The UI defaults to Material's indigo-pink styling. The Angular build configuration 'bcgov' can be combined with an environment configuration to create a build using the BC Government Colour palette and font.

```bash
$ cd ui
$ npm run watch:bcgov
```
