if (
  db.getCollectionNames().indexOf('jwtAllow') === -1 ||
  db.jwtAllow.countDocuments() === 0
) {
  db.jwtAllow.insertOne({});
}

db.collectionConfig.drop();
result = db.collectionConfig.insertOne({
  collection: 'environment',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  index: 0,
  edges: [],
  fields: { name: { type: 'string' }, short: { type: 'string' } },
  name: 'Environment',
});
result = db.collectionConfig.insertOne({
  collection: 'project',
  collectionMapper: [{ getPath: 'name', setPath: 'name' }],
  index: 1,
  edges: [{ collection: 'service', name: 'component', relation: 'oneToMany' }],
  fields: {
    name: { type: 'string' },
    key: { type: 'string' },
    configuration: { type: 'json' },
  },
  name: 'Project',
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
  fields: { name: { type: 'string' }, configuration: { type: 'json' } },
  name: 'Service',
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
      namePath: 'instance',
      relation: 'oneToOne',
    },
    {
      collection: 'serviceInstance',
      name: 'requires',
      inboundName: 'Required By',
      namePath: 'instance',
      relation: 'oneToMany',
    },
  ],
  fields: { name: { type: 'string' }, key: { type: 'string' } },
  name: 'Instance',
});
