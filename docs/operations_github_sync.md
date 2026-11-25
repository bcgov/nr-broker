# GitHub Sync

NR Broker can synchronize secrets and user roles from Vault to GitHub. Secrets are typically Broker Account tokens used in GitHub Actions. User sync keeps repository collaborator roles in sync with the graph.

For general information about how the collection sync system works, see [Collection Sync Overview](/dev_customize_collection_sync.md). For GitHub App deployment and user-sync role setup, see [GitHub Sync Development](/dev_github_sync.md).

## How it works

BullMQ workers consume the `github-sync-secrets`, `github-sync-users` and `github-catalog-scan` queues when queue processing is enabled. Collection sync requests enqueue repository IDs with a five-second debounce and deduplicate repeated requests for the same repository. When a repository is dequeued:

1. Broker looks up the repository and checks whether secret sync or user sync is enabled.
2. For **secret sync**, it reads all secrets from `apps/tools/<project>/<service>` in Vault and writes them as GitHub repository secrets.
3. For **user sync**, it reads the `edgeToRoles` configuration from the user collection config, traverses the graph to find users connected via those edges, and updates GitHub collaborator roles accordingly.
4. For **catalog sync**, it reads `catalog-info.yaml` from the default branch (following root `Location` targets one level) and records the projects, services, service instances and repository links in the graph.
5. Sync status is recorded on the repository (`syncSecretsStatus`, `syncUsersStatus`, `syncCatalogStatus`).

Queue processing runs in the API process unless it is configured as a separate worker. It is queue-driven rather than a fixed-interval cron poll.

> GitHub Secrets have a more restrictive key format than Vault. Ensure that secret keys in Vault also work well as GitHub secret keys.

## Prerequisites

- The deployment must have the GitHub App configured. See [GitHub Sync Development](/dev_github_sync.md).
- The Repository record must have an SCM URL matching `GITHUB_MANAGED_URL_REGEX` (by default, `https://github.com/<owner>/<repository>`).
- The Repository record must have **Enable secret sync** or **Enable user sync** enabled for the corresponding operation.
- The GitHub App must be installed for the repository and have permission to manage repository Actions secrets and collaborators as required by the enabled sync modes.

## Secret sync

Secret sync copies Vault secrets to GitHub repository secrets so they are available in GitHub Actions.

### Enabling secret sync

On the Repository record, set **Enable secret sync** to `true`. When a token is generated or secrets are manually synchronized, all secrets in the tools namespace for a service (`apps`/tools/`project`/`service`) will be synchronized to the associated repository.

## User sync

User sync keeps GitHub repository collaborator roles aligned with the graph. It uses the `edgeToRoles` configuration on the user collection to map graph edges to GitHub roles.

### How user sync works

1. Broker reads `edgeToRoles` from the user collection config, which defines which graph edges map to which GitHub roles (e.g., `admin`, `maintain`, `write`, `read`)
2. For each edge role, it traverses the graph upstream from the repository to find connected users
3. It compares current GitHub collaborators with the expected state and adds or removes collaborators as needed
4. Users in higher roles are skipped when processing lower roles (a user already assigned `admin` will not be downgraded when processing `write`)

### Enabling user sync

On the Repository record, set **Enable user sync** to `true`. User sync will run whenever the repository is enqueued on the `github-sync-users` queue.

## Monitoring sync status

The `syncSecretsStatus`, `syncUsersStatus` and `syncCatalogStatus` fields on the Repository record track:

- `queuedAt` — when the job was last enqueued
- `syncAt` — when the last attempt finished, including failed, partial and skipped attempts
- `state` — `success`, `failure`, `partial` or `skipped`
- `errorCode` — the HTTP status or error code, when available
- `errorMessage` — the reason an attempt failed, partially completed or was skipped

Each finished attempt replaces the previous result. A successful attempt clears old error details. Enqueuing another attempt updates only `queuedAt`, preserving the previous result until that attempt finishes. Older records may have timestamps without a state.

Catalog scans also update existing Repository records found by SCM URL, including scheduled scans. An incomplete catalog scan, a failed entity or relationship, or a skipped instance update records `partial`, not `success`. A missing root catalog file records `skipped`. GitHub access denials and other scan failures record `failure` before retry handling.

User and secret syncs record `partial` when some writes succeed and later writes fail. Repository secret sync status summarizes all services in the queued run so a later successful service cannot hide an earlier failure.

The Repository detail page shows the current sync status and time on one line. Select the status to see any error details from the last attempt. If another sync is queued, the line shows the queued time; previous error details remain available until that attempt finishes.

Sync activity is recorded in the audit log under the `broker.audit` dataset (for example, the `sync-tools`, `sync-graph` and `sync-github-catalog` actions). See: [Understanding the Audit Log](/operations_audit.md)

Terminal messages distinguish completed, partially completed, failed and skipped syncs. Partial attempts use the audit outcome `failure`; skipped attempts use `unknown`. Error codes and messages are included in audit error fields when available.

## Catalog scan

Broker can scan GitHub organizations for Backstage `catalog-info.yaml` files, such as those created by the [nr-repository-composer](https://github.com/bcgov/nr-repository-composer) `backstage` and `backstage-location` generators. Set `GITHUB_CATALOG_ORGS` to a comma-separated list of organizations. The GitHub App must be installed on each organization with read access to repository contents.

A scheduled job (`GITHUB_CATALOG_SCAN_CRON`, daily by default) adds one job per organization to the `github-catalog-scan` queue. Each organization job uses a single GitHub GraphQL query, paginated, to list repositories by push date. It adds one job for each active repository that has a `catalog-info.yaml` file at the root of the default branch and was pushed to since the last successful scan of that organization.

The last scan time is stored in Redis under `github-catalog-scan:last-scan:<org>`. The first scan, or a scan after this key is deleted, checks every repository. To force a full rescan of an organization, delete its key.

For each repository:

1. Broker reads every YAML document in `catalog-info.yaml` at the root of the default branch. Separate documents with `---`. Repositories without this file are skipped.
2. `Location` entities in the root `catalog-info.yaml` are followed one level to find catalog files in monorepos. Each target is read once, including all its YAML documents. `Location` entities in target files are ignored. Only relative paths inside the repository are followed. URLs and glob patterns are ignored.
3. The Repository is found by SCM URL. It is added if missing, with secret and user sync disabled. Adding fails if another Repository already has the same name. A Repository managed by the root `catalog-info.yaml` has its name, description, SCM URL and GitHub topic tags updated. Sync settings are not changed.
   Organization scans include the GitHub description and topics in each repository job. Direct repository syncs fetch the current description and topics from GitHub. The description falls back to `organization/repository` only when GitHub has no description. An empty topic list clears the Repository's tags.
4. Each `System` entity creates or updates a Project using `metadata.name`, `metadata.title`, `metadata.description`, `metadata.tags`, `spec.domain` and `spec.type`, even if no Components refer to it. Systems are synced before Components, regardless of document or file order. Tags replace the Project's tags after filtering and deduplication; `metadata.tags: []` clears them. Omitting tags, domain or type leaves the existing value unchanged. The domain reference is stored as supplied, without creating a Domain entity.
5. For each `Component` entity:
   - `spec.system` links to an existing Project. A Component alone never creates or updates a Project; declare a matching `kind: System` in the root file or a Location target to create it.
   - `metadata.name` becomes the Service. The title, description, lifecycle and type are updated from the catalog.
   - A `component` edge links the Project to the Service and a `source` edge links the Service to the Repository.
   - Entries in `metadata.links` with `type: instance` become service instances (see below). Other link types are ignored.
6. After Components sync, `spec.subcomponentOf` and `spec.dependsOn` link Services to other Services (see below).

Components without `spec.system`, or whose Project does not exist, still sync their Service, repository link and instances. The missing Project link is logged as a warning.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: artist-web
spec:
  system: artist
---
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: artist
  title: Artist
  description: Artist services
  tags:
    - music
spec:
  domain: entertainment
  type: platform
```

Items are added with the collection's default field values for anything the catalog does not set. Existing items keep values the catalog does not set.

### Service relationships

Components can declare relationships to other Services:

```yaml
spec:
  subcomponentOf: component:default/artist
  dependsOn:
    - artist-api
    - component:default/authentication
```

| Catalog field | Edge | Direction | Number of targets |
| --- | --- | --- | --- |
| `spec.subcomponentOf` | `subcomponent-of` | Child Service to parent Service | One |
| `spec.dependsOn` | `depends-on` | Service to dependency Service | Many |

The standard configuration marks both edge types as restricted (`restrict: true`), so new edges do not carry inherited graph permissions. Existing edges retain their restriction setting. These edge types do not cascade deletion to related Services in the standard configuration.

References may be a bare name, `default/name`, `component:name` or `component:default/name`. Broker Services have global names; other namespaces and entity kinds, such as `resource:default/database`, are not resolved. Unsupported references and missing Services are logged and skipped. No placeholder Services are created.

All Components in the repository are synced before relationships are resolved, so document and Location target order do not matter. Targets may also be existing Services from other repositories. Existing edges are reused. New edges record the declaring Component's catalog provenance. Removing a reference removes its catalog-owned edge (see cleanup below). An obsolete parent edge is removed before its replacement is added. Self-links, cycles and additional parents are rejected by the normal graph rules; other relationships continue syncing and the scan records a failure.

### Service instances

Declare deployed instances in `metadata.links`. Each instance link has:

| Field | Required | Description |
| --- | --- | --- |
| `type` | Yes | Must be `instance`. Links with any other type, or no type, are ignored. |
| `env` | Yes | The environment name, short name or alias, such as `production` or `prod` |
| `title` | No | The display name, stored as the instance name. Defaults to `env`. Use distinct titles to have more than one instance in an environment. |
| `url` | Yes | The base URL of the instance. Must be an `http://` or `https://` URL. |

```yaml
metadata:
  name: artist-web
  links:
    - type: instance
      env: production
      title: blue
      url: https://blue.example.gov.bc.ca
    - type: instance
      env: production
      title: green
      url: https://green.example.gov.bc.ca
    - type: instance
      env: test
      url: https://test.example.gov.bc.ca
```

Each instance is added under the Service with an `instance` edge and linked to its Environment with a `deploy-type` edge. Instance names must be unique within a component. If an instance link is not valid, the link is skipped and a warning is logged. An unknown environment fails only that instance.

Removing an instance link removes its catalog-owned edges. Normal graph cascade rules apply: removing an `instance` edge may also delete the instance and its environment edge. An existing instance cannot move to another environment through the catalog. Remove the instance in Broker or give its link a new title.

### Removing stale catalog edges

Each complete repository scan builds the desired edges before changing them. Edges with catalog provenance matching the repository and a catalog file are removed when they are no longer desired. This includes removed Components, relationship references, instance links and Location targets. A valid empty catalog can remove all catalog-owned edges for that repository.

The whole edge is removed if any provenance record matches, even if it also has manual, intention or another catalog's provenance. Edges with no matching catalog provenance are not cleanup candidates. An edge still needed by any current declaration is kept, including when its declaration moves between files.

Cleanup does not directly delete vertices. It uses normal graph deletion, including configured cascades that can delete service instances. Deletions are audited and invalidate the graph cache.

Cleanup is skipped when the root file is missing, a Location target cannot be read, any catalog document fails to parse, or entity and relationship planning is incomplete. Valid declarations can still sync during an incomplete scan. A Location target removed from the root file is different from an unreadable declared target: its old edges can be cleaned up on the next complete scan.

Stale edges are removed before desired edges are applied so one-to-one relationships can be replaced. Graph changes are incremental, not transactional. A failed deletion or creation is reported, other changes are attempted, and the scan records a failure.

### Catalog ownership

Items created or adopted by the catalog scan record the repository and catalog file that manages them. Catalog updates to an item with catalog provenance are only allowed for the same repository and catalog file. Items managed by another catalog file are handled as follows:

- **Repository and Project**: not updated. Services from the catalog are still linked to them.
- **Service**: the update is denied and recorded in the audit log as a failed `graph-vertex-edit`. The component is not synced. The rest of the repository continues to sync.
- **Service instance**: not updated. Other instances continue to sync.

### Adopting existing items

Catalog sync adopts each existing item without catalog provenance independently. Adoption adds a catalog record for the file, which manages the item from then on. Existing service links and the presence of a system are not prerequisites for adoption; normal graph relationship rules still apply.

- **Service**: adopted.
- **Project**: adopted only when declared by a `System` entity, unless a catalog file already manages it. Its catalog ownership comes from the System's file, not a Component's file.
- **Service instances**: existing instances under the Service named by instance links are adopted, unless a catalog file manages them or they are in a different environment. Instances under a Service the file already manages are adopted the same way, for example instances created by an intention.
- **Repository**: adopted for the root `catalog-info.yaml` if no catalog file manages it.
- **Edges**: existing desired edges without catalog provenance are adopted. An edge managed by a different catalog file is not adopted; its update is denied and the sync is reported as partially completed.

Each adoption is an edit, so it is recorded in the audit log. A failure to update one item does not prevent other items from syncing.

Users can still edit catalog items, but the next scan of the catalog file may revert their changes. Update the catalog file instead. See [Graph Provenance](/dev_graph_provenance.md) for details.
