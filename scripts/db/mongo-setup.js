if (
  db.getCollectionNames().indexOf('jwtAllow') === -1 ||
  db.jwtAllow.countDocuments() === 0
) {
  db.jwtAllow.insertOne({});
}

db.service.drop(); db.vertex.drop(); db.edge.drop(); db.project.drop(); db.environment.drop(); db.serviceInstance.drop();
db.user.drop();
db.collectionConfig.drop();
result = db.collectionConfig.insertOne({
  collection: 'environment',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  index: 0,
  edges: [],
  fields: {
    name: { required: true, type: 'string' },
    short: { required: true, type: 'string' },
  },
  name: 'Environment',
  permissions: {
    create: false,
    update: false,
    delete: false,
  },
});
result = db.collectionConfig.insertOne({
  collection: 'project',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  index: 1,
  edges: [
    { collection: 'service', name: 'component', relation: 'oneToMany' },
    { collection: 'project', name: 'owns', relation: 'oneToMany' },
  ],
  fields: {
    name: { required: true, type: 'string' },
    key: { required: true, type: 'string' },
    website: { type: 'url' },
    email: { type: 'email' },
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
    name: { required: true, type: 'string' },
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
    name: { required: true, type: 'string' },
    key: { required: true, type: 'string' },
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
  index: 4,
  edges: [
    {
      collection: 'project',
      name: 'developer',
      relation: 'oneToMany',
    },
    {
      collection: 'project',
      name: 'lead-developer',
      relation: 'oneToMany',
    },
    {
      collection: 'project',
      name: 'dba',
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
