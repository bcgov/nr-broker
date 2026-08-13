# Customize Connections

The links on the homepage can be configured by altering the `connectionConfig` collection in the MongoDB database.

There are two types: service and documentation.

## Connection Types

### External Services

The service type connection links to products using Broker data to enhance the developer experience. You can add in a link to your instance with the following.

```javascript
db.connectionConfig.insertOne({
  collection: 'service',
  description:
    'Securely store tokens, passwords and other secrets using HashiCorp Vault. Broker enables audited access for applications and teams.',
  href: 'https://example',
  name: 'Knox Vault',
  order: 10,
});
```

The initial install has no service connections defined.

### Documentation

The documentation type connection should link to your Broker Documentation. Links to things like your onboarding process would go here. Connections of this type are added like the following.

```javascript
db.connectionConfig.insertOne({
  collection: 'documentation',
  description:
    'Read about the benefits of NR Broker and how teams onboard.',
  href: 'https://example',
  name: 'Onboarding Documentation',
  order: 0,
});
```

The initial install has generic documentation connections defined.

## Configuration

### Available fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `collection` | string | Yes | Collection type: `service` or `documentation` |
| `description` | string | Yes | Description shown on the homepage |
| `href` | string | Yes | URL the link navigates to |
| `name` | string | Yes | Display name for the connection |
| `order` | number | Yes | Sort order (lower numbers appear first) |
| `documentationUrl` | string | No | URL to additional documentation |
| `imageUrl` | string | No | URL to an external image |
| `imageEmbedded` | string | No | Base64-encoded data URI for an embedded image |
| `vertexId` | string | No | ID of a graph vertex to associate with this connection |
| `roleChipMappings` | array | No | Array of role-to-chip mappings for access control |

### Configuring vertexId - Service type

The `vertexId` field is used with service type connection to associate it with the Broker vertex for the service. This enables the UI to link to it and show related data.

```javascript
db.connectionConfig.insertOne({
  collection: 'service',
  description: 'Manage deployment pipelines for your services.',
  href: 'https://ci.example.com',
  name: 'CI Pipeline',
  order: 20,
  vertexId: '<object-id-of-vertex>',
});
```

To find a vertex ID, query the service collection in MongoDB:

```javascript
db.service.findOne({ name: 'MyService' })
// Use the `_id` value as the vertexId
```

### Adding images - All types

Connections support two image options: `imageUrl` for external hosts and `imageEmbedded` for self-contained data URIs.

#### Using imageUrl

Set `imageUrl` to any accessible URL:

```javascript
db.connectionConfig.updateOne(
  { name: 'Knox Vault' },
  { $set: { imageUrl: 'https://example.com/vault-logo.png' } }
)
```

#### Using imageEmbedded

For embedded images, convert an image file to a base64 data URI using the provided script:

```bash
node scripts/image-to-embedded-string.mjs path/to/image.svg
```

The script supports SVG, PNG, JPEG, GIF, and WebP formats. For SVG files it automatically compresses the output by removing metadata and unnecessary whitespace.

Copy the output and set it as the `imageEmbedded` value:

```javascript
db.connectionConfig.updateOne(
  { name: 'Knox Vault' },
  { $set: { imageEmbedded: 'data:image/svg+xml;base64,PHN2Zy...' } }
)
```

**Tip:** For SVG files, optimize with https://jakearchibald.github.io/svgomg/ before running the script for smaller output.

### Configuring roleChipMappings - Service type

Add this to communicate to users if you are converting a team role to authorizations in a service.

The `roleChipMappings` array maps user roles to visual chips displayed in the UI. Each mapping requires a `role`, `label`, and `description`.

```javascript
db.connectionConfig.insertOne({
  collection: 'service',
  description: 'Access management for team resources.',
  href: 'https://identity.example.com',
  name: 'Identity Provider',
  order: 30,
  roleChipMappings: [
    {
      role: 'admin',
      label: 'Administrator',
      description: 'Full access to all resources',
    },
    {
      role: 'developer',
      label: 'Developer',
      description: 'Read and deploy to development environments',
    },
  ],
});
```

To update an existing connection:

```javascript
db.connectionConfig.updateOne(
  { name: 'Knox Vault' },
  {
    $set: {
      roleChipMappings: [
        {
          role: 'vault-admin',
          label: 'Vault Admin',
          description: 'Manage secrets and policies',
        },
      ],
    },
  }
)
```
