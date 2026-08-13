# External Queue Consumer Guide

External jobs can read from Redis queues independently of Broker. This guide provides a conceptual overview for building a consumer.

## Basic Pattern

```javascript
const redis = require('redis');

const client = redis.createClient({ url: 'redis://broker-redis:6379' });
await client.connect();

async function processQueue() {
  // Atomically dequeue an item
  const itemId = await client.rPop('github-sync-secrets');

  if (!itemId) {
    return; // No items, wait for next cycle
  }

  try {
    // Fetch entity details from Broker API or MongoDB
    const entity = await fetchEntityFromBroker(itemId);

    // Perform synchronization work
    await syncEntityToExternalSystem(entity);

    // Update status on success
    await updateSyncStatus(itemId, 'completed');
  } catch (error) {
    // Handle failure - requeue or log for retry
    console.error(`Failed to sync ${itemId}:`, error);
    await updateSyncStatus(itemId, 'failed');
  }
}

// Poll every 30 seconds
setInterval(processQueue, 30000);
```

## Key Considerations

1. **Atomic dequeue**: Use `RPOP` (or `BRPOP` for blocking) to ensure each item is processed by only one consumer instance
2. **Idempotency**: Design consumers to safely reprocess the same entity ID without side effects
3. **Error handling**: Track failure status so administrators can diagnose issues via the Broker UI
4. **Authentication**: Consumers need service-level access to Broker's API or MongoDB to fetch entity details
5. **Back pressure**: If the queue grows large, consider increasing consumer instances or poll frequency

## Example: Kubernetes Secret Sync Consumer

The built-in `kubernetes-sync-secrets` queue demonstrates this pattern. A cron job inside the Broker container polls Redis, fetches environment entities, and pushes secrets to Kubernetes namespaces. See [Kubernetes / OpenShift Secret Sync](/operations_kubernetes_sync.md) for a complete implementation reference.
