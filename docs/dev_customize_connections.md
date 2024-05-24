# Customize Connections

The links on the homepage can be configured by altering the `connectionConfig` collection in the MongoDB database.

There are two types: service and documentation.

## Service type connections

The service type connections should showcase how Broker data is being used to enhance the developer experience. An example would be your instance of Vault. You can add in a link to your instance with the following.

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

## Documentation type connections

The documentation type connection should link to your Broker Documentation. Links to thinks like your onboarding processing would go here. Connections of this type are adding like the following.

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
