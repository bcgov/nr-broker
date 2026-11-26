# Graph Provenance

Broker records which sources created or updated each vertex and edge in the graph. This prevents automated syncs from changing items managed by a different automated source.

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

## Update rules

`GraphService` checks provenance before editing a vertex or edge.

- Manual and intention updates are always allowed. Manual updates still require the normal permissions.
- OpenSearch updates are denied when catalog provenance exists. Remove the catalog provenance first if OpenSearch should manage the item.
- Catalog updates are allowed only when there is no conflicting automated provenance. Any catalog record must match the repository and catalog file, and no OpenSearch record may exist. Manual and intention records do not prevent adoption. A denied update returns a 403 error and records a failure in the audit log.
- Adding an item is always allowed. The new item starts with a record for the source that added it.

Records are not mutually exclusive. If a user edits an item created by a catalog file, the catalog file can still update the item and may revert the manual change.

Items that existed before provenance was added have no records. Catalog sync can take over these items unless another automated sync manages them. See [GitHub Sync](/operations_github_sync.md#adopting-existing-items) for the checks. Callers can check an update in advance with `GraphService.isUpdateAllowed(records, provenance)`.

## Removing records

Admins can remove the records of one type from a vertex or an edge, for example when a catalog file no longer exists and should stop managing the item. Removing records does not change the item. Other sources can still update it, and an item with no records is treated like one that existed before provenance was added.
To transfer catalog ownership, remove the existing catalog record first; the new catalog file can then adopt the item if it meets the adoption checks.

```
DELETE /v1/graph/vertex/:id/provenance/:type
DELETE /v1/graph/edge/:id/provenance/:type
```

- `type` is `manual`, `catalog`, `intention` or `opensearch`. Any other value returns 400.
- Catalog updates only apply to an item managed by the same catalog file, so an item has one catalog record in practice. If it has several, all of them are removed.
- The request returns 404 if the item has no record of the type.
- The call is audited as `graph-vertex-provenance-delete` or `graph-edge-provenance-delete`. It publishes a `vertex-edit` or `edge-edit` graph event.

The collection inspector and the edge browser show a Remove button on each source in the Managed By section for admins.

## Passing provenance

`GraphService.addVertex`, `editVertex`, `upsertVertex`, `addEdge` and `editEdge` take an optional `ProvenanceInfo` (`api/src/persistence/provenance-info.ts`) as the last argument. It wraps the `ProvenanceEmbeddable` record to apply. It defaults to `ProvenanceInfo.manual()`. Automated services pass their own:

```typescript
await this.graphService.upsertVertex(
  null,
  vertexInsert,
  'name',
  null,
  ProvenanceInfo.catalog(repository.scmUrl, component.path),
);
```

Repository calls that pass no provenance, such as sync status updates, leave the records unchanged.
