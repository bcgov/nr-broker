/* eslint-disable no-undef */
db.collectionConfig.update(
  { collection: 'user' },
  {
    $set: {
      edges: [
        {
          id: 'f69ac0c8',
          collection: 'brokerAccount',
          name: 'administrator',
          inboundName: 'administrators',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: '79ceccbd',
          collection: 'project',
          name: 'owner',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: 'bbba80bc',
          collection: 'team',
          name: 'owner',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: 'db00aada',
          collection: 'project',
          name: 'lead-developer',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: 'aa573095',
          collection: 'team',
          name: 'lead-developer',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: 'ad24909b',
          collection: 'project',
          name: 'developer',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: 'ad796493',
          collection: 'team',
          name: 'developer',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: 'w8zfccq',
          collection: 'team',
          name: 'tester',
          relation: 'oneToMany',
          show: true,
        },
      ],
    },
  },
);

db.graphPermission.insertOne({ name: 'tester', data: [ { name: 'lead-developer', index: 6, permissions: [] }, { name: 'owns', index: 5, permissions: [] }, { name: 'authorized', index: 1, permissions: [] }, { name: 'component', index: 2, permissions: ['approve'] }, ], });

db.collectionConfig.updateOne( { collection: 'server' }, { $set: { 'permissions.filter': false } });
db.collectionConfig.updateOne( { collection: 'environment' }, { $set: { 'permissions.filter': false } }, );
db.collectionConfig.updateOne( { collection: 'project' }, { $set: { 'permissions.filter': true } }, );
db.collectionConfig.updateOne( { collection: 'service' }, { $set: { 'permissions.filter': true } }, );
db.collectionConfig.updateOne( { collection: 'serviceInstance' }, { $set: { 'permissions.filter': false } }, );
db.collectionConfig.updateOne( { collection: 'user' }, { $set: { 'permissions.filter': false } }, );
db.collectionConfig.updateOne( { collection: 'brokerAccount' }, { $set: { 'permissions.filter': true } }, );
db.collectionConfig.updateOne( { collection: 'team' }, { $set: { 'permissions.filter': true } }, );


// Aug 2, 2024
db.collectionConfig.updateOne( { collection: 'server' }, { $set: { sync:  { index: 'nrm-metrics-d', unique: 'host.hostname', map: { 'host.hostname': { type: 'first', dest: 'name', }, 'host.architecture': { type: 'first', dest: 'architecture', }, 'host.name': { type: 'pick', endsWith: ['bcgov', 'dmz'], dest: 'hostName', }, 'host.os.family': { type: 'first', dest: 'osFamily', }, 'host.os.full': { type: 'first', dest: 'osFull', }, 'host.os.kernel': { type: 'first', dest: 'osKernel', }, 'host.os.name': { type: 'first', dest: 'osName', }, 'host.os.type': { type: 'first', dest: 'osType', }, 'host.os.version': { type: 'first', dest: 'osVersion', }, }, } }, }, );
db.collectionConfig.updateOne( { collection: 'server' }, { $set: { fields: { name: { name: 'Name', required: true, type: 'string', unique: true, hint: 'The lowercase name of the server', }, acquired: { name: 'Acquired', required: true, type: 'date', hint: 'The date when the server was acquired', init: 'now', }, architecture: { name: 'Architecture', required: false, type: 'string', hint: 'Machine architecture (x86_64, ...)', }, description: { name: 'Description', required: false, type: 'string', hint: 'A short human readable description of the entity', }, hostName: { name: 'Host Name', required: true, type: 'string', hint: 'The lowercase fully qualified domain name (FQDN) used to connect', }, osFamily: { name: 'OS Family', required: false, type: 'string', hint: 'OS family (redhat, ...)', }, osFull: { name: 'OS Full', required: false, type: 'string', hint: 'OS string containing things like name, version, code name', }, osKernel: { name: 'OS Kernel', required: false, type: 'string', hint: 'Kernel version string', }, osName: { name: 'OS Name', required: false, type: 'string', hint: 'OS name without version (Red Hat Enterprise Linux, ...)', }, osType: { name: 'OS Type', required: false, type: 'string', hint: 'OS family like linux, macos, etc.', }, osVersion: { name: 'OS Version', required: false, type: 'string', hint: 'System version string', }, } } });

db.collectionConfig.updateOne( { collection: 'user' }, { $set: { fields: { alias: { name: 'Links', type: 'embeddedDoc', valuePath: 'domain' }, domain: { name: 'Domain', required: true, type: 'string', }, email: { name: 'Email', required: true, type: 'email', }, guid: { name: 'GUID', required: true, type: 'string', }, name: { name: 'Name', required: true, type: 'string', }, username: { name: 'Username', required: true, type: 'string', }, }, browseFields: ['domain', 'username', 'name', 'email', 'alias'] } });