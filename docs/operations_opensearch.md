# OpenSearch Integration

If your deployment forwards logs to OpenSearch, Broker can use it to perform searches.

## Broker Account Token Usage

Broker logs an audit which shows how many time a Broker account token is used. OpenSearch can be employed to query and display this data.

In order to integrate with OpenSearch, Broker requires the environment variable `OPENSEARCH_INDEX_BROKER_AUDIT` be set with the index pattern for the Broker audit.

## Collection Sync

The broker can synchronize collections with unique names from an index. It searches for unique names from the past 12 hours and iterates over them. For each value, a document is sampled, and an entry for the collection is upserted into the broker.

This is configured by adding a `sync` field to the `collectionConfig` document for the collection you want to synchronize. You must specify the index to query, the unique name value in the source index, and a mapping for the fields from the document to the collection.

## Index Patterns

Environment variables and other configurations that store index names can accept a comma-separated string listing the indices to query. If an index ends with -d, appropriate indices for the time period (ending in -yyyy-mm-dd) will be generated.

Example: Last 24 hour period from noon on Aug 31, 2020 for index `example-d` on would generate `example-2020-08-31` and `example-2020-08-30`.
