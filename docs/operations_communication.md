# Communication Setup

The communication module in the NR Broker backend updates users about events that occur with collection objects that they are connected to.

## How it works

Users are connected to collection objects in NR Broker's graph. Any collection object can act as a source of a communication event that is then sent out to upstream users with (optionally) the relevant roles on their team.

As an example, a deployment might trigger an event on that service that moves up through the graph to find tester role users so that they can begin testing.

Communication events are all queued and then processed by the node that pulls the event off the queue.

For details on how the communication queue processes events and resolves user subscriptions, see [Communication Queue](/operations_communication_queue.md).

## Modifying Templates

Each event uses [EJS](https://ejs.co) templates to render the text and subject of the communication. These templates are stored in the `communicationTemplate` MongoDB collection and can be modified to suit your needs.

### Template Structure

Each template document has the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique identifier for the template (e.g., `test`, `deployment-notification`) |
| `email` | string | EJS template for the email body (HTML) |
| `subject` | string | EJS template for the email subject line |

### Available Context Variables

When rendering templates, the following variables are available:

- `user` — the recipient user object (includes `email`, `name`, etc.)
- `brokerUrl` — the base URL of the Broker instance
- Additional context depends on the event type and is passed by the queuing code

### Managing Templates

Templates can be managed directly in MongoDB:

```javascript
// View all templates
db.communicationTemplate.find()

// Update a template
db.communicationTemplate.updateOne(
  { key: 'deployment-notification' },
  { $set: { email: '<h1>Deployment Complete</h1>...', subject: 'Deployment: {{context.serviceName}}' } }
)

// Insert a new template
db.communicationTemplate.insertOne({
  key: 'my-custom-event',
  email: '<p>Hello {{user.name}}, an event occurred.</p>',
  subject: 'Event Notification'
})
```

## Configuring Default User Subscriptions

Default subscriptions determine which users receive notifications based on their team roles. These are configured in the `collectionWatchConfig` MongoDB collection.

### Watch Config Structure

Each watch config document defines which roles receive notifications for a given collection type:

| Field | Type | Description |
|-------|------|-------------|
| `collection` | string | Collection type (e.g., `service`, `environment`, `project`) |
| `roles` | string[] | Team roles that receive default notifications |
| `watches` | array | Watch identifiers with channel and optional event filters |

Each watch identifier contains:

| Field | Type | Description |
|-------|------|-------------|
| `channel` | string | Notification channel name (e.g., `deployment`, `build`) |
| `events` | string[] | Optional list of specific events to subscribe to |

### Configuring Default Subscriptions

```javascript
// View existing watch configs
db.collectionWatchConfig.find()

// Add default subscriptions for a collection
db.collectionWatchConfig.insertOne({
  collection: 'service',
  roles: ['lead-developer', 'tester'],
  watches: [
    { channel: 'deployment', events: ['deploy-started', 'deploy-completed'] },
    { channel: 'build' }
  ]
})
```

When a communication event is queued for a `service` vertex, users with the `lead-developer` or `tester` roles on connected teams will receive notifications — unless they have configured explicit watch preferences that override the defaults.

## Email Setup

If the `NOTIFICATION_EMAIL_*` environment variables are set, the communication email service will attempt to send updates using SMTP.

See: [Environment Variables](/dev_env_vars.md)

## Default Fallback

If no communication service is available, events on collection objects that would have been sent to the user are output to standard out using the dummy service.
