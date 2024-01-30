// Team
db.team.insertMany([
  {
    _id: ObjectId('64ecc18acf9ec5f71c640e4b'),
    name: 'AdminTeam',
    email: 'admin@team.com',
    vertex: ObjectId('64ecc18acf9ec5f71c640e4a'),
    website: 'http://google.com',
  },
  {
    _id: ObjectId('64fa194693b3afd6ee63aa9a'),
    name: 'DBA',
    email: 'dba@team.com',
    vertex: ObjectId('64fa194693b3afd6ee63aa99'),
  },
]);

// Vertex
db.vertex.insertMany([
  {
    _id: ObjectId('64ecc18acf9ec5f71c640e4a'),
    collection: 'team',
    name: 'AdminTeam',
  },
  {
    _id: ObjectId('64fa194693b3afd6ee63aa99'),
    collection: 'team',
    name: 'DBA',
  },
  {
    _id: ObjectId('64ecc156cf9ec5f71c640e48'),
    collection: 'user',
    name: 'Haris Goddard',
  },
  {
    _id: ObjectId('64ecc31bcf9ec5f71c640e52'),
    collection: 'user',
    name: 'Regana Blair',
  },
  {
    _id: ObjectId('64ecc31fcf9ec5f71c640e56'),
    collection: 'user',
    name: 'Daigo Saad',
  },
  {
    _id: ObjectId('64ee6cd8554e36049d5c83fe'),
    collection: 'user',
    name: 'Chantal Heinz',
  },
]);

// User
db.user.insertMany([
  {
    _id: ObjectId('64ecc156cf9ec5f71c640e49'),
    vertex: ObjectId('64ecc156cf9ec5f71c640e48'),
    domain: 'idp',
    email: 'haris.goddard@company.example',
    guid: '4E5651918FBA4BC1AEBF0D388C8D1C46',
    name: 'Haris Goddard',
    username: 'hgoddard',
  },
  {
    _id: ObjectId('64ecc31bcf9ec5f71c640e53'),
    domain: 'idp',
    email: 'regana.blair@company.example',
    name: 'Regana Blair',
    username: 'rblair',
    guid: '7D51B8BDACF643CDB8F5AF5518B65267',
    vertex: ObjectId('64ecc31bcf9ec5f71c640e52'),
  },
  {
    _id: ObjectId('64ecc31fcf9ec5f71c640e57'),
    domain: 'idp',
    email: 'daigo.saad@company.example',
    name: 'Daigo Saad',
    username: 'dsaad',
    guid: 'C29DF84A645547779CA6FAC53FD57313',
    vertex: ObjectId('64ecc31fcf9ec5f71c640e56'),
  },
  {
    _id: ObjectId('64ee6cd8554e36049d5c83ff'),
    domain: 'idp',
    email: 'chantal.heinz@company.example',
    name: 'Chantal Heinz',
    username: 'cheinz',
    guid: 'F9FF2532E6CA47EFB428B9DCE81CBF8D',
    vertex: ObjectId('64ee6cd8554e36049d5c83fe'),
  },
]);

// Edge
db.edge.insertMany([
  {
    _id: ObjectId('64ecde26cf9ec5f71c640e64'),
    name: 'developer',
    source: ObjectId('64ecc156cf9ec5f71c640e48'),
    target: ObjectId('64ecc18acf9ec5f71c640e4a'),
    is: 4,
    it: 6,
  },
  {
    _id: ObjectId('64fa19c193b3afd6ee63aa9c'),
    name: 'developer',
    source: ObjectId('64ecc31fcf9ec5f71c640e56'),
    target: ObjectId('64fa194693b3afd6ee63aa99'),
    is: 4,
    it: 6,
  },
  {
    _id: ObjectId('64fa19d793b3afd6ee63aa9d'),
    name: 'developer',
    source: ObjectId('64ee6cd8554e36049d5c83fe'),
    target: ObjectId('64ecc18acf9ec5f71c640e4a'),
    is: 4,
    it: 6,
  },
  {
    _id: ObjectId('64ee6989554e36049d5c83f5'),
    name: 'owner',
    source: ObjectId('64ecc156cf9ec5f71c640e48'),
    target: ObjectId('64ecc18acf9ec5f71c640e4a'),
    is: 4,
    it: 6,
  },
  {
    _id: ObjectId('64fa199d93b3afd6ee63aa9b'),
    name: 'owner',
    source: ObjectId('64ecc31bcf9ec5f71c640e52'),
    target: ObjectId('64fa194693b3afd6ee63aa99'),
    is: 4,
    it: 6,
  },
]);

// Project
db.project.insertMany([
  {
    _id: ObjectId('644c4d302e2f63acef6bb72f'),
    name: 'vault',
    key: 'vault',
    vertex: ObjectId('644c4d302e2f63acef6bb72e'),
  },
]);

db.service.insertMany([
  {
    _id: ObjectId('644c4d302e2f63acef6bb72d'),
    name: 'vault-app',
    vertex: ObjectId('644c4d302e2f63acef6bb72c'),
  },
]);

db.vertex.insertMany([
  {
    _id: ObjectId('644c4d302e2f63acef6bb72e'),
    collection: 'project',
    name: 'vault',
  },
  {
    _id: ObjectId('644c4d302e2f63acef6bb72c'),
    collection: 'service',
    name: 'vault-app',
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb733'),
    collection: 'serviceInstance',
    name: 'production',
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb745'),
    collection: 'serviceInstance',
    name: 'test',
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb73e'),
    collection: 'serviceInstance',
    name: 'development',
  },
]);

const prodEnvironment = db.environment.findOne({ name: 'production' });
const testEnvironment = db.environment.findOne({ name: 'test' });
const devEnvironment = db.environment.findOne({ name: 'development' });
db.edge.insertMany([
  {
    _id: ObjectId('644c4d312e2f63acef6bb730'),
    name: 'component',
    is: 1,
    it: 2,
    source: ObjectId('644c4d302e2f63acef6bb72e'),
    target: ObjectId('644c4d302e2f63acef6bb72c'),
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb735'),
    name: 'instance',
    is: 2,
    it: 3,
    source: ObjectId('644c4d302e2f63acef6bb72c'),
    target: ObjectId('644c4d312e2f63acef6bb733'),
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb736'),
    name: 'deploy-type',
    is: 3,
    it: 0,
    source: ObjectId('644c4d312e2f63acef6bb733'),
    target: prodEnvironment._id,
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb748'),
    name: 'deploy-type',
    is: 3,
    it: 0,
    source: ObjectId('644c4d312e2f63acef6bb745'),
    target: testEnvironment._id,
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb741'),
    name: 'deploy-type',
    is: 3,
    it: 0,
    source: ObjectId('644c4d312e2f63acef6bb73e'),
    target: devEnvironment._id,
  },
]);

db.serviceInstance.insertMany([
  {
    _id: ObjectId('644c4d312e2f63acef6bb734'),
    name: 'production',
    vertex: ObjectId('644c4d312e2f63acef6bb733'),
    url: 'https://vault-app.example',
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb746'),
    name: 'test',
    vertex: ObjectId('644c4d312e2f63acef6bb745'),
    url: 'https://test.vault-app.example',
  },
  {
    _id: ObjectId('644c4d312e2f63acef6bb73f'),
    name: 'development',
    vertex: ObjectId('644c4d312e2f63acef6bb73e'),
    url: 'https://dev.vault-app.example',
  },
]);

// ==> Collection Config Prototype
db.collectionConfig.update(
  { collection: 'team' },
  {
    $set: {
      edges: [
        {
          collection: 'brokerAccount',
          name: 'owns',
          inboundName: 'owned by',
          relation: 'oneToMany',
          show: true,
        },
        {
          collection: 'service',
          name: 'uses',
          inboundName: 'used by',
          relation: 'oneToMany',
          show: false,
          prototypes: [
            {
              name: 'Group Access',
              description:
                'Group access provides a space in Vault to store private team secrets and additional access policies.',
              target: ObjectId('644c4d302e2f63acef6bb72c'),
              targetName: 'Knox',
              permissions: {
                request: 'ownedBy',
              },
              property: {
                group: {
                  hint: 'Unique lowercase group name in service',
                  name: 'Group name',
                  placeholder: 'Role name',
                  required: true,
                  type: 'string',
                },
                kv: {
                  hint: "Can be 'teams' or blank to disable team secrets",
                  name: 'Team space',
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
    },
  },
);
