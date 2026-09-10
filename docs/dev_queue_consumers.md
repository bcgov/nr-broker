# External Queue Consumer Guide

External jobs can consume Broker's BullMQ queues independently. This guide provides a conceptual overview for building a consumer.

## Basic Pattern

```javascript
const { Worker } = require('bullmq');

const worker = new Worker(
  'github-sync-secrets',
  async (job) => {
    // Fetch entity details from Broker API or MongoDB.
    const entity = await fetchEntityFromBroker(job.data);

    // Perform synchronization work and update status.
    await syncEntityToExternalSystem(entity);
    await updateSyncStatus(entity.id, 'completed');
  },
  {
    connection: {
      host: 'broker-redis',
      port: 6379,
    },
  },
);

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});
```

## Key Considerations

1. **Job claiming**: BullMQ claims each job for one worker, so multiple consumer instances can safely share a queue
2. **Idempotency**: Design consumers to safely reprocess the same entity ID without side effects
3. **Error handling**: Track failure status so administrators can diagnose issues via the Broker UI
4. **Authentication**: Consumers need service-level access to Broker's API or MongoDB to fetch entity details
5. **Back pressure**: If the queue grows large, consider increasing consumer instances or poll frequency

## Example: Kubernetes Secret Sync Consumer

The built-in `kubernetes-sync-secrets` queue demonstrates this pattern. A BullMQ worker inside Broker fetches environment entities and pushes secrets to Kubernetes namespaces. See [Kubernetes / OpenShift Secret Sync](/operations_kubernetes_sync.md) for a complete implementation reference.

## Built-in Consumer and Independent Scaling

Each of the four data queues is consumed by a built-in BullMQ worker registered
with `BullService`. By default every API replica starts a worker for every data
queue. BullMQ claims a job for exactly one worker, so replicas can safely compete
for work.

The `QUEUE_PROCESSING` environment variable controls which queues a process
consumes, which allows a process to be a dedicated worker for a single queue or to
opt out of queue processing entirely:

- `QUEUE_PROCESSING` unset or `all`: consume every queue (the default, historical
  behaviour).
- `QUEUE_PROCESSING="notification-coms"`: start a worker for only that queue.
  Run `npm run start:queue-worker` as a separate process to give a busy queue its
  own consumer and improve its responsiveness by removing contention with the
  other queues.
- `QUEUE_PROCESSING=""`: consume no queue (an HTTP-only instance).

Multiple consumers of the same queue are safe because BullMQ claims each job for
one worker. BullMQ leader jobs, such as intention expiry and token lifecycle,
are repeatable jobs that run once per schedule tick across all API replicas and
standalone workers. See
[Backend Environment Variables - Queue Processing](/dev_env_vars.md#queue-processing)
for the full reference.
