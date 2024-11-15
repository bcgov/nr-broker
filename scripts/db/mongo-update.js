/* eslint-disable no-undef */
/* eslint-disable prettier/prettier */

db.environment.update({name: 'production'}, {$set: {title: 'Production', position: 0}});
db.environment.update({name: 'test'}, {$set: {title: 'Test', position: 10}});
db.environment.update({name: 'development'}, {$set: {title: 'Development', position: 20}});
db.environment.update({name: 'tools'}, {$set: {title: 'Tools', position: 30}});

db.collectionConfig.deleteOne({collection: 'environment'});
db.collectionConfig.insertOne({
  collection: 'environment',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 0,
  edges: [],
  fields: {
    name: {
      name: 'Name',
      required: true,
      type: 'string',
      unique: true,
      hint: 'A unique machine friendly key for the environment',
    },
    short: {
      name: 'Short Name',
      required: true,
      type: 'string',
      unique: true,
      hint: 'A short unique machine friendly key for the environment',
    },
    aliases: {
      name: 'Aliases',
      required: true,
      type: 'stringArray',
      hint: 'Set of service instance names to map to this environment',
    },
    title: {
      name: 'Title',
      required: true,
      type: 'string',
      hint: 'A freeform human readable alternative to the name',
    },
    position: {
      name: 'Position',
      required: true,
      type: 'number',
      hint: 'Ordering of environments with 0 being production',
    },
  },
  name: 'Environment',
  permissions: {
    create: false,
    update: true,
    delete: false,
  },
  show: false,
});

db.collectionConfig.update({collection: 'user'}, { $set: { fields: { alias: { type: 'embeddedDoc', }, domain: { name: 'Domain', required: true, type: 'string', }, email: { name: 'Email', required: true, type: 'email', }, guid: { name: 'GUID', required: true, type: 'string', }, name: { name: 'Name', required: true, type: 'string', }, username: { name: 'Username', required: true, type: 'string', }, }, } });

db.collectionConfig.update({collection: 'team'}, {
  $set: {
    edges: [
      {
        id: '73c74f2b',
        collection: 'brokerAccount',
        name: 'owns',
        inboundName: 'owned by',
        relation: 'oneToMany',
        show: true,
      },
      {
        id: '213b9678',
        collection: 'service',
        name: 'uses',
        inboundName: 'used by',
        relation: 'oneToMany',
        show: false,
        prototypes: [
          {
            name: 'Tenant',
            description:
              'A Tenant gives a team a space to build visualizations, dashboards and other objects. Other users have read access only.',
            target: ObjectId('6531c48d5e6a3ea98fd86fe2'),
            targetName: 'OpenSearch',
            permissions: {
              request: 'ownedBy',
            },
            property: {
              role: {
                hint: 'Unique lowercase role name in service',
                name: 'Role name',
                placeholder: 'OIDC role name',
                required: true,
                type: 'string',
              },
              tenantName: {
                hint: 'Tenant cannot be renamed after creation',
                name: 'Tenant name',
                placeholder: 'Tenant name',
                required: true,
                type: 'string',
              },
            },
            url: '<%= url %>/_dashboards/app/home#/',
          },
          {
            name: 'Group Access',
            description:
              'Group access provides a space in Knox to store private team secrets and additional access policies.',
            target: ObjectId('644c4d302e2f63acef6bb72c'),
            targetName: 'Knox',
            permissions: {
              request: 'ownedBy',
            },
            property: {
              group: {
                hint: 'Unique lowercase group name in service',
                name: 'Group name',
                placeholder: 'OIDC role name',
                required: true,
                type: 'string',
              },
              kv: {
                hint: "Can be 'groups' or blank to disable team secrets",
                name: 'Group space',
                placeholder: 'Mount Path',
                required: true,
                type: 'string',
              },
              policies: {
                hint: 'Additional access policies for group (comma separated)',
                name: 'Policies',
                placeholder: 'Policies',
                required: true,
                type: 'string',
              },
            },
            url: '<%= url %>/ui<% if (property.group) { %>/vault/secrets/groups/kv/list/<%= property.group %>/<% } %>',
          },
        ],
      },
    ],
  }
});