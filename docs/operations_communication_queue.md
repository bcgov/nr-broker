# Communication Queue

The communication queue is an internal consumer that processes notification events from Redis and delivers them to users via configured channels (e.g., email). Unlike collection sync queues, the communication queue does not use `syncQueues` rules — it is triggered directly by backend services when events occur.

## How it works

When an event occurs on a collection object (e.g., a deployment completes), the Broker backend queues a communication job to the `notification-coms` Redis list. A cron job polls this queue every 30 seconds, resolves the target users, and dispatches notifications through available channels.

### Job Structure

Each queued job contains:

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | string | Unique identifier for tracking and audit |
| `type` | string | Event type (e.g., `deployment`, `build`) |
| `vertexId` | string | ID of the collection object that triggered the event |
| `toUsers` | array | Primary user references to resolve |
| `optionalUsers` | array | Fallback user references (used only if `toUsers` resolves to no one) |
| `template` | string | Template key for rendering email/subject |
| `context` | object | EJS context variables for the template |

### Processing Flow

1. The cron job dequeues a job from `notification-coms` using `RPOP`
2. For each user reference in `toUsers`, it resolves actual users:
   - **Upstream references**: Finds users connected to the vertex via team roles
   - **Watch references**: Finds users with explicit watch subscriptions or matching default configs
3. Optional user references are skipped if at least one primary user was resolved
4. Each resolved user receives the notification through all configured channels
5. Results are logged to the audit trail

## User Subscription Resolution

The communication system supports two types of user references:

### Upstream Role References

Finds users who have a specific role on teams connected upstream from the target vertex.

```typescript
{ ref: 'upstream', value: 'tester' }
```

This traverses the graph from the vertex upward, looking for users with the `tester` role on connected teams. Multiple roles can be specified as an array.

### Watch References

Resolves users based on their watch subscriptions for a specific channel and event.

```typescript
{ ref: 'watch', value: 'deployment', event: 'deploy-completed' }
```

Watch resolution follows this priority:

1. **Explicit watches**: Users who have saved a watch configuration for the vertex are checked first. If their watch matches the channel and event, they receive the notification.

2. **Default watches**: For users without explicit watches, the system looks up `collectionWatchConfig` entries matching the vertex's collection type. If a user's team roles match the config's `roles` field, and the watch channel/event matches, they receive the notification.

3. **Override behavior**: Users with explicit watch configurations are excluded from default subscriptions — their explicit preferences take precedence.

## Watch Configuration

### Explicit User Watches

Stored in the `collectionWatch` MongoDB collection, these represent user-defined subscription preferences for specific objects:

| Field | Type | Description |
|-------|------|-------------|
| `vertex` | ObjectId | The collection object being watched |
| `user` | ObjectId | The user who configured the watch |
| `watches` | array | List of channel/event subscriptions |

Each watch entry contains:

| Field | Type | Description |
|-------|------|-------------|
| `channel` | string | Notification channel (e.g., `deployment`, `build`) |
| `events` | string[] | Optional list of specific events to subscribe to |

### Default Watch Configs

Stored in the `collectionWatchConfig` collection, these define which roles receive notifications by default for a given collection type:

| Field | Type | Description |
|-------|------|-------------|
| `collection` | string | Collection type (e.g., `service`, `environment`) |
| `roles` | string[] | Team roles eligible for default notifications |
| `watches` | array | Channel/event definitions |

## Testing the Queue

The communication queue can be tested using the admin API endpoint:

```bash
curl -X POST "https://broker.example.com/api/communication/test?vertexId=<id>&toRole=lead-developer&template=test" \
  -H "Authorization: Bearer <token>"
```

This queues a test notification for users with the specified role connected to the given vertex.

## Health Monitoring

The communication queue exposes a health check endpoint that reports on queue status and processing metrics. The cron job is registered with NestJS's `SchedulerRegistry` and can be dynamically enabled or disabled at runtime.

## Related

- [Communication Setup](/operations_communication.md) — Admin guide for templates and default subscriptions
- [Collection Sync Queues](/dev_customize_collection_sync.md) — How sync queues differ from the communication queue
