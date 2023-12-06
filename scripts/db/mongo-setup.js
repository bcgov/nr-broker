db.service.drop();
db.vertex.drop();
db.edge.drop();
db.brokerAccount.drop();
db.project.drop();
db.environment.drop();
db.jwtRegistry.drop();
db.jwtBlock.drop();
db.serviceInstance.drop();
db.team.drop();
db.user.drop();
db.collectionConfig.drop();
db.intention.drop();

db.jwtAllow.insertOne({});

// ==> Environments
result = db.vertex.insertOne({ collection: 'environment', name: 'production' });
db.environment.insertOne({
  name: 'production',
  short: 'prod',
  aliases: [],
  vertex: result.insertedId,
});
result = db.vertex.insertOne({ collection: 'environment', name: 'test' });
db.environment.insertOne({
  name: 'test',
  short: 'test',
  aliases: [],
  vertex: result.insertedId,
});
result = db.vertex.insertOne({
  collection: 'environment',
  name: 'development',
});
db.environment.insertOne({
  name: 'development',
  short: 'dev',
  aliases: [],
  vertex: result.insertedId,
});
result = db.vertex.insertOne({ collection: 'environment', name: 'tools' });
db.environment.insertOne({
  name: 'tools',
  short: 'tools',
  aliases: [],
  vertex: result.insertedId,
});

// ==> Collection Configs
result = db.collectionConfig.insertOne({
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
  },
  name: 'Environment',
  permissions: {
    create: false,
    update: true,
    delete: false,
  },
  show: false,
});
result = db.collectionConfig.insertOne({
  collection: 'project',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 1,
  edges: [
    {
      collection: 'service',
      name: 'component',
      relation: 'oneToMany',
      show: true,
    },
  ],
  fields: {
    name: {
      name: 'Name',
      required: true,
      type: 'string',
      unique: true,
      hint: 'A unique name for the project that must be lowercase kebab',
    },
    title: {
      name: 'Title',
      required: false,
      type: 'string',
      hint: 'A freeform non-technical alternative to the name',
    },
    description: {
      name: 'Description',
      required: false,
      type: 'string',
      hint: 'A short human readable description of the entity',
    },
    website: {
      name: 'Website URL',
      type: 'url',
      hint: 'The website documenting this project',
    },
    email: {
      name: 'Email',
      type: 'email',
      hint: 'The email address to contact those running this project',
    },
  },
  name: 'Project',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
  show: true,
});
result = db.collectionConfig.insertOne({
  collection: 'service',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 2,
  edges: [
    {
      collection: 'serviceInstance',
      name: 'instance',
      onDelete: 'cascade',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'service',
      name: 'provision-token',
      onDelete: 'cascade',
      relation: 'oneToMany',
      show: true,
    },
  ],
  fields: {
    name: {
      name: 'Name',
      required: true,
      type: 'string',
      unique: true,
      hint: 'A unique name for the service that must be lowercase kebab',
    },
    title: {
      name: 'Title',
      required: false,
      type: 'string',
      hint: 'A freeform non-technical alternative to the name',
    },
    description: {
      name: 'Description',
      required: false,
      type: 'string',
      hint: 'A short human readable description of the entity',
    },
    scmUrl: {
      name: 'SCM URL',
      required: false,
      type: 'url',
      hint: 'Source control management url',
    },
  },
  name: 'Service',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
  show: true,
});
result = db.collectionConfig.insertOne({
  collection: 'serviceInstance',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 3,
  edges: [
    {
      collection: 'environment',
      name: 'deploy-type',
      inboundName: 'Instance',
      relation: 'oneToOne',
      show: true,
    },
    {
      collection: 'serviceInstance',
      name: 'requires',
      inboundName: 'Required By',
      relation: 'oneToMany',
      show: false,
    },
  ],
  fields: {
    name: {
      name: 'Name',
      required: true,
      type: 'string',
      hint: 'A name for the service instance',
    },
    pkgInstallHistory: {
      type: 'embeddedDocArray',
    },
  },
  name: 'Instance',
  parent: {
    edgeName: 'instance',
  },
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
  show: false,
});
result = db.collectionConfig.insertOne({
  collection: 'user',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 4,
  edges: [
    {
      collection: 'brokerAccount',
      name: 'administrator',
      inboundName: 'administrators',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'project',
      name: 'owner',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'team',
      name: 'owner',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'project',
      name: 'lead-developer',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'team',
      name: 'lead-developer',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'project',
      name: 'developer',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'team',
      name: 'developer',
      relation: 'oneToMany',
      show: true,
    },
  ],
  fields: {
    domain: {
      name: 'Domain',
      required: true,
      type: 'string',
    },
    email: {
      name: 'Email',
      required: true,
      type: 'email',
    },
    guid: {
      name: 'GUID',
      required: true,
      type: 'string',
    },
    name: {
      name: 'Name',
      required: true,
      type: 'string',
    },
    username: {
      name: 'Username',
      required: true,
      type: 'string',
    },
  },
  name: 'User',
  permissions: {
    create: false,
    update: false,
    delete: true,
  },
  show: false,
});

result = db.collectionConfig.insertOne({
  collection: 'brokerAccount',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 5,
  edges: [
    {
      collection: 'project',
      name: 'authorized',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'service',
      name: 'authorized',
      relation: 'oneToMany',
      show: true,
    },
  ],
  fields: {
    name: {
      name: 'Name',
      required: true,
      type: 'string',
      unique: true,
      hint: 'A descriptive name for the account',
    },
    email: {
      name: 'Email (sub)',
      required: true,
      type: 'email',
      hint: 'Email address to use as the sub claim in generated JWT',
    },
    clientId: {
      name: 'Client ID',
      required: true,
      init: 'uuid',
      type: 'string',
      hint: 'Generated UUID used to uniquely identify all generated JWTs',
    },
    website: {
      name: 'Website',
      required: false,
      type: 'url',
      hint: 'The location the account is used',
    },
    enableUserImport: {
      name: 'Enable user import',
      required: true,
      type: 'boolean',
      hint: 'Enable account to import users',
      value: false,
    },
    requireRoleId: {
      name: 'Require RoleId',
      required: true,
      type: 'boolean',
      hint: 'Must send Vault service role id to use actions. Recommended when JWT is shared by teams.',
    },
    requireProjectExists: {
      name: 'Require Project Exists',
      required: true,
      type: 'boolean',
      hint: 'Require project to be owned by account',
      value: true,
    },
    requireServiceExists: {
      name: 'Require Service Exists',
      required: false,
      type: 'boolean',
      hint: 'Require service to be owned by account',
      value: false,
    },
    skipUserValidation: {
      name: 'Skip User Validation',
      required: true,
      type: 'boolean',
      hint: 'Defaults unknown users to developer access',
      value: false,
    },
  },
  name: 'Broker Account',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
  show: true,
});

result = db.collectionConfig.insertOne({
  collection: 'team',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 6,
  edges: [
    {
      collection: 'brokerAccount',
      name: 'owns',
      relation: 'oneToMany',
      show: true,
    },
    {
      collection: 'service',
      name: 'uses',
      inboundName: 'used by',
      relation: 'oneToMany',
      show: false,
    },
  ],
  fields: {
    name: {
      name: 'Name',
      required: true,
      type: 'string',
      unique: true,
      hint: 'A descriptive name for the team',
    },
    email: {
      name: 'Email',
      required: true,
      type: 'email',
      hint: 'The email address to contact the team at',
    },
    website: {
      name: 'Website',
      required: false,
      type: 'url',
      hint: 'The team website address',
    },
  },
  name: 'Team',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
  show: true,
});

// ==> User setup
use('admin');
if (db.getUser('admin_db_engine') === null) {
  db.createUser({
    user: 'admin_db_engine',
    pwd: 'admin_secret',
    roles: [
      { role: 'userAdmin', db: 'admin' },
      { role: 'userAdmin', db: 'brokerDB' },
    ],
  });
}
