# MongoDB

## Local Development

### Connecting to the local database

```bash
mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB
```

### Configure local database

```bash
# Configure the local MongoDB with basic setup
$ ./scripts/mongo-setup.sh
```

The setup script can be rerun to reset the local database. You may need to reindex the redis cache by calling the api `/v1/graph/reindex-cache`.

### Taking and restoring a local database snapshot

```bash
mongodump --host=localhost:27017 --authenticationDatabase=admin -u=mongoadmin -p=secret --db=brokerDB -o dump
mongorestore --host=localhost:27017 --authenticationDatabase=admin -u=mongoadmin -p=secret --db=brokerDB ./dump/brokerDB
```

## Production

### Restoring a database from a dump

If you have an existing database, connect to it and delete it first.

```javascript
brokerDB> db.dropDatabase();
```

To restore, run the following. Alter the path to dump taken with mongodump as needed. The important thing is that you want to overwrite the broker database (brokerDB) and not the authentication database.

```bash
mongorestore --host=localhost:27017 --authenticationDatabase=admin -u=mongoadmin -p=secret --db=brokerDB *path/to/backup*/brokerDB
```

If you want to use the samples in the scripts folder, you may need to alter the user value sent and the team ids (admin and DBA) in [setenv-backend-dev.sh](scripts/setenv-backend-dev.sh).
