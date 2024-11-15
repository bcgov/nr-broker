db.collectionConfig.updateMany({}, {$set: {fieldDefaultSort: {field: 'name', dir: 1}}});
db.collectionConfig.updateOne({collection: 'environment'}, {$set: {fieldDefaultSort: {field: 'position', dir: 1}}});


db.collectionConfig.updateOne(
  {collection: 'environment'},
  {$set: {color: '2ec7c9', hint: 'An environment refers to the context in which software is deployed and run, encompassing the tools, configurations, and infrastructure that support its operation.'}}
);

db.collectionConfig.updateOne(
  {collection: 'project'},
  {$set: {color: 'b6a2de', hint: 'A project groups services and common information.'}}
);

db.collectionConfig.updateOne(
  {collection: 'service'},
  {$set: {color: '5ab1ef', hint: 'A service is a software component that runs in an environment.'}}
);

db.collectionConfig.updateOne(
  {collection: 'serviceInstance'},
  {$set: {color: 'ffb980', hint: 'A service instance is a provisioned service.'}}
);

db.collectionConfig.updateOne(
  {collection: 'user'},
  {$set: {color: 'd87a80', hint: 'A user is a real or virtual person that can be granted access in Broker.'}}
);

db.collectionConfig.updateOne(
  {collection: 'brokerAccount'},
  {$set: {color: '8d98b3', hint: 'A Broker Account grants programmatic access to the API to teams and allows them to access associated services.'}}
);

db.collectionConfig.updateOne(
  {collection: 'team'},
  {$set: {color: 'e5cf0d', hint: 'A team is a collection of users with roles that can be granted control of accounts and access to services.'}}
);

db.collectionConfig.updateOne(
  {collection: 'server'},
  {$set: {color: '97b552', hint: 'A server is a real or virtual machine that hosts installs of services.'}}
);
