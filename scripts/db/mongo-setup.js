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
      required: true,
      type: 'string',
      unique: true,
      hint: 'A unique machine friendly key for the environment',
    },
    short: {
      required: true,
      type: 'string',
      unique: true,
      hint: 'A short unique machine friendly key for the environment',
    },
    aliases: {
      required: true,
      type: 'stringArray',
      hint: 'A set of environment alias names to automatically map to this environment',
    },
  },
  name: 'Environment',
  permissions: {
    create: false,
    update: true,
    delete: false,
  },
});
result = db.collectionConfig.insertOne({
  collection: 'project',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  collectionVertexName: 'name',
  index: 1,
  edges: [
    { collection: 'service', name: 'component', relation: 'oneToMany' },
    { collection: 'project', name: 'owns', relation: 'oneToMany' },
  ],
  fields: {
    name: {
      required: true,
      type: 'string',
      unique: true,
      hint: 'A unique name for the project',
    },
    website: { type: 'url', hint: 'The website documenting this project' },
    email: {
      type: 'email',
      hint: 'The email address to contact those running this project',
    },
    configuration: { type: 'json' },
  },
  name: 'Project',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
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
    },
  ],
  fields: {
    name: { required: true, type: 'string', unique: true },
    configuration: { type: 'json' },
  },
  name: 'Service',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
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
    },
    {
      collection: 'serviceInstance',
      name: 'requires',
      inboundName: 'Required By',
      relation: 'oneToMany',
    },
  ],
  fields: {
    name: {
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
    },
    {
      collection: 'project',
      name: 'developer',
      relation: 'oneToMany',
    },
    {
      collection: 'team',
      name: 'developer',
      relation: 'oneToMany',
    },
    {
      collection: 'project',
      name: 'lead-developer',
      relation: 'oneToMany',
    },
    {
      collection: 'team',
      name: 'lead-developer',
      relation: 'oneToMany',
    },
    {
      collection: 'project',
      name: 'owner',
      relation: 'oneToMany',
    },
    {
      collection: 'team',
      name: 'owner',
      relation: 'oneToMany',
    },
  ],
  fields: {
    email: { required: true, type: 'string' },
    guid: { required: true, type: 'string' },
    name: { required: true, type: 'string' },
    username: { required: true, type: 'string' },
  },
  name: 'User',
  permissions: {
    create: false,
    update: false,
    delete: true,
  },
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
    },
    {
      collection: 'service',
      name: 'authorized',
      relation: 'oneToMany',
    },
  ],
  fields: {
    name: {
      required: true,
      type: 'string',
      unique: true,
      hint: 'A descriptive name for the account',
    },
    email: {
      required: true,
      type: 'string',
      hint: 'Email address to use as the sub claim in generated JWT',
    },
    clientId: {
      required: true,
      init: 'uuid',
      type: 'string',
      hint: 'Generated UUID used to uniquely identify all generated JWTs',
    },
    requireRoleId: {
      required: true,
      type: 'boolean',
      hint: 'Must send Vault service role id to use actions. Recommended when JWT is shared by teams.',
    },
    requireProjectExists: {
      required: true,
      type: 'boolean',
      hint: 'Require project to be owned by account',
      value: true,
    },
    requireServiceExists: {
      required: false,
      type: 'boolean',
      hint: 'Require service to be owned by account',
      value: false,
    },
  },
  name: 'Broker Account',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
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
    },
  ],
  fields: {
    name: {
      required: true,
      type: 'string',
      unique: true,
      hint: 'A descriptive name for the team',
    },
    email: {
      required: true,
      type: 'string',
      hint: 'The email address to contact the team at',
    },
  },
  name: 'Team',
  permissions: {
    create: true,
    update: true,
    delete: true,
  },
});
