# GitHub sync (catalog)

NR Broker can sync Backstage catalog files from GitHub into its graph. Developers describe their projects, services and deployed instances in `catalog-info.yaml`; Broker discovers those files and keeps the corresponding graph items and links in sync.

For general information about collection sync, see [Collection Sync Queues](/dev_customize_collection_sync.md).

## How it works

1. A scheduled scan finds eligible repositories in configured GitHub organizations and queues them for catalog sync.
2. A worker reads the repository's catalog and syncs its declarations to the graph.
3. Broker records the result on the Repository and in the audit log.

See the [Backstage catalog reference](/backstage-doc/README.md) for file schemas, examples and integrity checks.

## Prepare a repository

Add a `catalog-info.yaml` file to the root of the default branch. See the [catalog reference](/backstage-doc/README.md) for how to structure its contents.

The GitHub App must have access to the repository, and the organization must be configured for scheduled scans. Ask a Broker administrator to set up access or request a scan if needed.

## Catalog graph behavior

### Removing stale catalog edges

Each complete repository scan builds the desired edges before changing them. Edges with catalog provenance matching the repository and a catalog file are removed when they are no longer desired. This includes removed Components, relationship references, instance links and Location targets. A valid empty catalog can remove all catalog-owned edges for that repository.

The whole edge is removed if any provenance record matches, even if it also has manual, intention or another catalog's provenance. Edges with no matching catalog provenance are not cleanup candidates. An edge still needed by any current declaration is kept, including when its declaration moves between files.

Cleanup does not directly delete vertices. It uses normal graph deletion, including configured cascades that can delete service instances. Deletions are audited and invalidate the graph cache.

Cleanup is skipped when the root file is missing, a Location target cannot be read, any catalog document fails to parse, or entity and relationship planning is incomplete. Valid declarations can still sync during an incomplete scan. A Location target removed from the root file is different from an unreadable declared target: its old edges can be cleaned up on the next complete scan. Unsupported or missing Service relationship targets are reported and skipped, but do not by themselves make the edge plan incomplete; cleanup can still run.

Stale edges are removed before desired edges are applied so one-to-one relationships can be replaced. Graph changes are incremental, not transactional. A failed deletion or creation is reported, other changes are attempted, and the scan records a failure.

### Catalog ownership

Items created or adopted by the catalog scan record the repository and catalog file that manages them. Catalog updates to an item with catalog provenance are only allowed for the same repository and catalog file. Items managed by another catalog file are handled as follows:

- **Repository and Project**: not updated. Services from the catalog are still linked to them.
- **Service**: the update is denied and recorded in the audit log as a failed `graph-vertex-edit`. The Component is not synced. The rest of the repository continues to sync.
- **Service instance**: not updated. Other instances continue to sync.

### Adopting existing items

Catalog sync adopts each existing item independently when it is not managed by another automated sync. Items with manual or intention provenance, or no provenance, can be adopted. An item already managed by a catalog file can only be updated by that same repository and catalog file path; an item managed by OpenSearch sync is not adopted. Adoption adds a catalog record for the file, which manages the item from then on. Existing service links and the presence of a system are not prerequisites for adoption; normal graph relationship rules still apply.

- **Service**: adopted.
- **Project**: adopted only when declared by a `System` entity, unless a catalog file already manages it. Its catalog ownership comes from the System's file, not a Component's file.
- **Service instances**: existing instances under the Service named by instance links are adopted, unless a catalog file manages them or they are in a different environment. Instances under a Service the file already manages are adopted the same way, for example instances created by an intention.
- **Repository**: adopted for the root `catalog-info.yaml` if no catalog file manages it.
- **Edges**: existing desired edges without conflicting automated provenance are adopted. An edge that already has the desired catalog provenance is reused without an edit, even if it has other provenance records. Otherwise, a conflicting catalog or OpenSearch record prevents adoption and the sync is reported as partially completed.

Each adoption is an edit, so it is recorded in the audit log. A failure to update one item does not prevent other items from syncing.

Users can still edit catalog items, but the next scan of the catalog file may revert their changes. Update the catalog file instead. See [Graph Provenance](/dev_graph_provenance.md) for details.

## Monitoring sync status

Check `syncCatalogStatus` on the Repository and the `sync-github-catalog` audit records for the result. A missing root file is recorded as skipped. An organization-level success message means repositories were queued, not that they synced successfully. See [monitoring sync status](/operations_github_sync.md#monitoring-sync-status).

The worker logs and consumes job-handler errors rather than automatically retrying them. A non-rate-limit GitHub 403 is recorded as an access denial; ask an administrator to check the app installation and permissions. Rate limits and other errors are also recorded, but need a subsequent scan request or schedule to try again.

## Administrator setup

### Organization discovery

The `GithubCatalogOrgScanner` discovers repositories and queues their scans; `GithubCatalogService` consumes both organization and repository jobs on `github-catalog-scan`.

1. The repeatable leader job enqueues an `org` job for each configured organization. The job ID is `org-<organization>`, so an existing job with that ID prevents a duplicate. Completed and failed jobs are removed.
2. The scanner obtains an organization installation token and reads the last scan timestamp from Redis at `github-catalog-scan:last-scan:<organization>`.
3. It pages through GitHub GraphQL results, 50 repositories at a time, ordered by most recent push. It stops when it reaches a repository with no push date or a push date older than the saved timestamp.
4. It queues a `repo` job for each non-archived, enabled repository with a default branch and a root `catalog-info.yaml` that is a file. On incremental scans, the default branch must also have a commit since the saved timestamp. Repository push activity on another branch alone is not enough. Jobs include the default branch, GitHub URL, description and up to 100 topics.
5. After discovery and enqueueing finish, the scanner saves the **start time** of the organization scan and records the number of eligible repositories submitted to the queue in the audit log. This count can include jobs deduplicated by ID. If discovery or enqueueing throws, it does not advance the timestamp.

On the first scan, when there is no saved timestamp, the scanner does not apply the default-branch history filter. To request another full discovery, remove that organization's timestamp key from Redis before triggering a scan. The timestamp records successful **discovery and enqueueing**, not successful completion of the repository jobs; check repository results separately. A failed repository job may need an explicit rescan even when organization discovery succeeded.

The scanner reports GraphQL errors unless the last element of the error path is `catalogFile` or `defaultBranchRef`. Missing values for those fields cause the affected repository to be skipped.

### Repository sync

When the scan finds at least one valid System or Component, the Repository is found by SCM URL and added if missing. The standard configuration disables secret and user sync for new repositories; collection configuration defaults can override these fallback values. Adding fails if another Repository already has the same name. When the root catalog file manages an existing Repository, its name, description, SCM URL and GitHub topic tags are updated; sync settings are not changed. A snapshot with no valid Systems or Components does not create or update the Repository, although a complete empty snapshot can remove stale edges.

Organization jobs include GitHub topics and include the description when present. Repository scans fetch current metadata if either is missing. The description falls back to `organization/repository` when GitHub has no description, and an empty topic list clears Repository tags.

### Manual scans

An administrator authenticated with OIDC can request a scan:

- `POST /v1/github/catalog/scan` queues each configured organization. This uses the saved timestamps; it is not automatically a full scan.
- `POST /v1/github/catalog/scan?url=<repository-url>` queues one repository. The URL must match `GITHUB_MANAGED_URL_REGEX`, and its organization must be in `GITHUB_CATALOG_ORGS`.

The response is `204` when the request is queued, not when processing completes. Collection sync can also queue a Repository ID; the worker resolves its SCM URL and scans that repository directly. Repository jobs use the ID `repo-<organization>-<repository>` to deduplicate jobs with the same ID while they exist.

An organization scan that already advanced its timestamp may not rediscover a failed repository without a new default-branch commit. Request a single-repository scan or reset the timestamp for a full discovery.

### Configuration

| Setting | Purpose |
| --- | --- |
| `GITHUB_SYNC_CLIENT_ID`, `GITHUB_SYNC_PRIVATE_KEY` | GitHub App credentials. Both are required to register the catalog queue worker. |
| `GITHUB_CATALOG_ORGS` | Comma-separated organization names. At least one organization and both credentials are required to schedule organization scans. |
| `GITHUB_CATALOG_SCAN_CRON` | Leader job schedule; defaults to `0 5 * * *`. |
| `QUEUE_PROCESSING` | Include `github-catalog-scan` or use `all` to process catalog jobs. The default is `all`. |

Install the GitHub App on the organizations and repositories to be scanned, with read access to repository contents. Redis must be available to BullMQ and the scanner. Leader scheduling and data-queue consumption are separate: a scheduled job can enqueue work even when that process does not consume the catalog queue. Ensure at least one configured process consumes it.
