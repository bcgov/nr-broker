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
