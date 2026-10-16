# Graph Provenance

Broker records which sources created or updated each vertex and edge in the graph. This is used to stop automated catalog updates from changing items that a different catalog file manages.

## Provenance records

Vertices and edges store a `provenance` array. Each record has a type, and the time it was first and last applied.

| Type | Recorded when | Extra fields |
| --- | --- | --- |
| `manual` | A user adds or edits the item through the API or UI | None |
| `catalog` | The GitHub catalog scan adds or edits the item | `repository` (SCM URL) and `path` (catalog file path relative to the repository root) |
| `intention` | Intention sync adds or edits the item | None |
| `opensearch` | The OpenSearch graph sync adds or edits the item | None |

An item can have several records. A record that matches an existing one only refreshes its update time. Catalog records match when the repository and path are the same.

Provenance is internal. It is hidden from entity serialization and removed from graph and collection query results.

## Collection source flag

Collection items (Service, Server, Project, etc.) have a `source` field. It holds the latest automated source to update the item: `catalog`, `intention` or `opensearch`. It is null or missing for items only managed manually. Manual edits do not change the flag. The flag does not include the repository or path.

The `source` field is read-only. It cannot be set through vertex data.

## Update rules

`GraphService` checks provenance before editing a vertex or edge.

- Manual, intention and OpenSearch updates are always allowed. Manual updates still require the normal permissions.
- Catalog updates are only allowed if the item has a catalog record with the same repository and path. Otherwise the update is denied with a 403 error and a failure is recorded in the audit log.
- Adding an item is always allowed. The new item starts with a record for the source that added it.

Records are not mutually exclusive. If a user edits an item created by a catalog file, the catalog file can still update the item and may revert the manual change.

Items that existed before provenance was added have no records. Catalog updates to these items are denied.

## Passing provenance

`GraphService.addVertex`, `editVertex`, `upsertVertex`, `addEdge` and `editEdge` take an optional `ProvenanceEmbeddable` as the last argument. It defaults to `ProvenanceEmbeddable.manual()`. Automated services pass their own:

```typescript
await this.graphService.upsertVertex(
  null,
  vertexInsert,
  'name',
  null,
  ProvenanceEmbeddable.catalog(repository.scmUrl, component.path),
);
```

Repository calls that pass no provenance, such as sync status updates, leave the records and source flag unchanged.
