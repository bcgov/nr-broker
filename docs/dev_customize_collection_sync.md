# Collection Sync Queues

The collection sync system enables Broker to enqueue work items into Redis queues that external jobs can consume. This decouples long-running or specialized synchronization tasks from the core API, allowing independent scaling and technology choices for downstream consumers.

## How it works

When a sync is triggered (via the API or a cron job), Broker performs the following steps:

1. Looks up `syncQueues` rules configured on the target collection
2. Resolves which entities should be queued using either direct queue rules or graph traversal rules
3. Pushes entity IDs onto Redis lists named in `REDIS_QUEUES`
4. External jobs dequeue items and perform the actual synchronization work

By syncing, it smooths out spikes in processing and, optionally, deduplicates already queued identical requests.

## Configuration overview

Sync configuration is split across two MongoDB collections:

| Collection | Purpose |
|------------|---------|
| `syncQueueConfig` | Defines queue metadata, labels, descriptions, and enablement requirements |
| `collectionConfig` (field `syncQueues`) | Maps collections to queues and defines traversal rules |

### Reserved queue names

These queue names are used by internal jobs:

| Key | Queue Name | Typical Consumer |
|-----|------------|------------------|
| `GITHUB_SYNC_SECRETS` | `github-sync-secrets` | [GitHub Sync](/operations_github_sync.md) — secrets |
| `GITHUB_SYNC_USERS` | `github-sync-users` | [GitHub Sync](/operations_github_sync.md) — users |
| `KUBERNETES_SYNC_SECRETS` | `kubernetes-sync-secrets` | [Kubernetes / OpenShift Secret Sync](/operations_kubernetes_sync.md) |

## Configuring a Sync Queue

The `syncQueueConfig` collection defines the metadata and requirements for each queue.

```javascript
db.syncQueueConfig.insertOne({
  queue: 'GITHUB_SYNC_SECRETS',
  label: 'GitHub Secrets Sync',
  summary: 'Synchronize secrets to GitHub repositories',
  description: [
    'When a team or repository changes, this queue ensures',
    'that GitHub secrets are updated accordingly.',
  ],
  types: ['secrets'],
  requires: {
    envAll: ['GITHUB_SYNC_CLIENT_ID', 'GITHUB_SYNC_PRIVATE_KEY'],
  },
});
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `queue` | string | Yes | Unique queue identifier (must match a key in `REDIS_QUEUES`) |
| `label` | string | Yes | Display name for admin UI |
| `summary` | string | Yes | Short description shown in summaries |
| `description` | string[] | Yes | Detailed description array |
| `types` | string[] | Yes | Sync types this queue supports (e.g., `secrets`, `users`) |
| `requires.envAll` | string[] | No | Environment variables that must be set for this queue to be enabled |
| `requires.health` | string | No | Health check key (reserved for future use) |
| `setup.gitHubUserLink` | boolean | No | Indicates GitHub user linking is required for setup |

### Enablement requirements

A queue is considered enabled only when all requirements in `requires` are met. The most common requirement is `envAll`, which checks that a list of environment variables are set and non-empty. If any variable is missing, the queue is disabled and sync operations will return a service unavailable error.

```javascript
// Queue disabled if GITHUB_SYNC_CLIENT_ID is not set
db.syncQueueConfig.updateOne(
  { queue: 'GITHUB_SYNC_SECRETS' },
  { $set: { requires: { envAll: ['GITHUB_SYNC_CLIENT_ID', 'GITHUB_SYNC_PRIVATE_KEY'] } } }
)
```

## Configuring collection sync rules

The `syncQueues` field on `collectionConfig` defines how entities in a collection are queued. Each rule is an object with either a `queue` property (direct enqueue) or a `traverse` property (graph traversal).

### Direct queue rule

A direct queue rule enqueues the entity itself when a sync is triggered on that collection.

```javascript
db.collectionConfig.updateOne(
  { collection: 'repository' },
  {
    $set: {
      syncQueues: [
        {
          queue: {
            queue: 'GITHUB_SYNC_SECRETS',
            requiredEnabledProperty: 'syncSecretsEnabled',
            queuedStatusProperty: 'syncSecretsStatus',
          },
        },
      ],
    },
  }
)
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `queue` | string | Yes | Queue identifier (must match a `syncQueueConfig.queue`) |
| `requiredEnabledProperty` | string | No | Property name on the entity; if `true`, the entity is eligible for queuing |
| `queuedStatusProperty` | string | No | Property name updated with queue status timestamps |

### Graph traversal rule

A traversal rule walks the graph from a source entity to related entities in another collection, enqueueing those targets. This is useful when a change to one entity (e.g., a team) should trigger sync for related entities (e.g., repositories).

```javascript
db.collectionConfig.updateOne(
  { collection: 'team' },
  {
    $set: {
      syncQueues: [
        {
          traverse: {
            collection: 'repository',
            direction: 'downstream',
            maxDepth: 8,
            edgeNames: ['repository'],
            queues: ['GITHUB_SYNC_SECRETS'],
          },
        },
      ],
    },
  }
)
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `collection` | string | Yes | Target collection to traverse to |
| `direction` | string | Yes | `downstream` (children) or `upstream` (parents) |
| `maxDepth` | number | No | Maximum graph depth to traverse |
| `edgeNames` | string[] | No | Filter to specific edge names |
| `queues` | string[] | Yes | Queue identifiers applied to discovered targets |

### Combining rules

A collection can have both direct and traversal rules. When a sync is triggered, Broker evaluates all rules and enqueues matching entities.

```javascript
db.collectionConfig.updateOne(
  { collection: 'repository' },
  {
    $set: {
      syncQueues: [
        // Direct: enqueue this repository
        {
          queue: {
            queue: 'GITHUB_SYNC_SECRETS',
            queuedStatusProperty: 'syncSecretsStatus',
          },
        },
        // Traverse: also enqueue related environments
        {
          traverse: {
            collection: 'environment',
            direction: 'downstream',
            maxDepth: 2,
            queues: ['KUBERNETES_SYNC_SECRETS'],
          },
        },
      ],
    },
  }
)
```

## Triggering sync

Sync can be triggered via the API endpoint:

```bash
# Sync by queue name
curl -X POST "https://broker.example.com/api/collection/repository/<id>/sync?queue=GITHUB_SYNC_SECRETS" \
  -H "Authorization: Bearer <token>"

# Sync by type (resolves all queues of that type)
curl -X POST "https://broker.example.com/api/collection/team/<id>/sync?type=secrets" \
  -H "Authorization: Bearer <token>"

# Dry run (returns targets without queuing)
curl -X POST "https://broker.example.com/api/collection/repository/<id>/sync?queue=GITHUB_SYNC_SECRETS&dryRun=true" \
  -H "Authorization: Bearer <token>"
```

For guidance on building external consumers, see [Queue Consumer Guide](/dev_queue_consumers.md).
