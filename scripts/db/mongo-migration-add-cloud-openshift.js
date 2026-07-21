// Migration script to add Cloud and OpenShiftProject collections to an existing NR Broker database
// Run with: mongosh brokerDB scripts/db/mongo-migration-add-cloud-openshift.js

/* eslint-disable no-undef */

print('=== NR Broker Migration: Adding Cloud and OpenShift Project Collections ===');

let migrated = false;

// Add or update cloud collection config
const existingCloudConfig = db.collectionConfig.findOne({ collection: 'cloud' });
if (!existingCloudConfig) {
  print('Adding cloud collection configuration...');
} else {
  print('Updating cloud collection configuration...');
}
db.collectionConfig.updateOne(
  { collection: 'cloud' },
  {
    $set: {
      collection: 'cloud',
      collectionMapper: [{ getPath: 'name', setPath: 'name' }],
      collectionVertexName: 'name',
      index: 9,
      edges: [
        {
          id: 'c1o2u3d4',
          collection: 'openshiftProject',
          name: 'project',
          relation: 'oneToMany',
          show: true,
        },
        {
          id: 'd7f8a9b0',
          collection: 'server',
          name: 'server',
          relation: 'oneToMany',
          show: true,
        },
      ],
      fieldDefaultSort: {
        field: 'name',
        dir: 1,
      },
      fields: {
        name: {
          name: 'Name',
          required: true,
          type: 'string',
          unique: true,
          hint: 'A unique name for the cloud provider instance',
        },
        description: {
          name: 'Description',
          required: false,
          type: 'string',
          hint: 'A short human readable description of the cloud instance',
        },
        type: {
          name: 'Type',
          required: true,
          type: 'select',
          options: [
            { value: 'on-premise', label: 'On-premise' },
            { value: 'openshift', label: 'OpenShift' },
            { value: 'aws', label: 'AWS' },
            { value: 'azure', label: 'Azure' },
            { value: 'gcp', label: 'GCP' },
          ],
          hint: 'The type of cloud provider',
        },
        consoleUrl: {
          name: 'Console URL',
          required: false,
          type: 'url',
          subclass: 'openshift',
          hint: 'The URL to the cloud provider console',
        },
        clusterName: {
          name: 'Cluster Name',
          required: false,
          type: 'string',
          subclass: 'openshift',
          hint: 'The name of the cluster within the cloud provider',
        },
        apiUrl: {
          name: 'API URL',
          required: false,
          type: 'url',
          subclass: 'openshift',
          hint: 'The URL of the API server',
        },
      },
      browseFields: ['name', 'type', 'clusterName'],
      name: 'Cloud',
      hint: 'A grouping of cloud resources used by teams to deploy and manage services.',
      color: '7c6aad',
      permissions: {
        browse: true,
        create: true,
        filter: true,
        update: true,
        delete: true,
      },
      show: false,
      showUserRoles: false,
    },
  },
  { upsert: true }
);
migrated = true;

// Add or update openshiftProject collection config
const existingOpenshiftConfig = db.collectionConfig.findOne({ collection: 'openshiftProject' });
if (!existingOpenshiftConfig) {
  print('Adding openshiftProject collection configuration...');
} else {
  print('Updating openshiftProject collection configuration...');
}
db.collectionConfig.updateOne(
  { collection: 'openshiftProject' },
  {
    $set: {
      collection: 'openshiftProject',
      collectionMapper: [{ getPath: 'name', setPath: 'name' }],
      collectionVertexName: 'name',
      connectedTable: [
        { collection: 'serviceInstance', direction: 'downstream' },
      ],
      index: 10,
      edges: [],
      fieldDefaultSort: {
        field: 'name',
        dir: 1,
      },
      fields: {
        name: {
          name: 'Name',
          required: true,
          type: 'string',
          unique: true,
          hint: 'The lowercase name of the OpenShift project',
        },
        displayName: {
          name: 'Display Name',
          required: false,
          type: 'string',
          hint: 'A short human readable display name for the project',
        },
        enableSyncSecrets: {
          name: 'Enable secret sync',
          required: true,
          type: 'boolean',
          hint: 'Enable sync of secrets to project (if supported)',
          value: false,
        },
        enableSyncUsers: {
          name: 'Enable user sync',
          required: true,
          type: 'boolean',
          hint: 'Enable sync of users to project (if supported)',
          value: false,
        },
        syncSecretsStatus: {
          type: 'embeddedDoc',
          required: false,
          mask: {
            sudo: ['queuedAt', 'syncAt'],
          },
        },
        syncUsersStatus: {
          type: 'embeddedDoc',
          required: false,
          mask: {
            sudo: ['queuedAt', 'syncAt'],
          },
        },
      },
      browseFields: ['name'],
      name: 'OpenShift Project',
      hint: 'An OpenShift project is a logical isolation boundary for resources within an OpenShift cluster.',
      color: '45b08f',
      sudoHelp:
        'Allows operations such as secret and user synchronization',
      permissions: {
        browse: true,
        create: true,
        filter: true,
        update: true,
        delete: true,
      },
      show: false,
      showUserRoles: true,
    },
  },
  { upsert: true }
);
migrated = true;

// Update team collection config to add cloud edge and connected table entry
const teamConfig = db.collectionConfig.findOne({ collection: 'team' });
if (teamConfig) {
  const teamEdges = Array.isArray(teamConfig.edges) ? teamConfig.edges : [];
  const cloudEdgeIndex = teamEdges.findIndex((edge) => edge.collection === 'cloud');

  if (cloudEdgeIndex === -1) {
    print('Adding cloud operates edge to team collection configuration...');
    db.collectionConfig.updateOne(
      { collection: 'team' },
      {
        $push: {
          edges: {
            id: 'c9b7a6e5',
            collection: 'cloud',
            name: 'operates',
            titleInbound: 'Operated by',
            relation: 'oneToMany',
            show: true,
          },
        },
      },
    );
    migrated = true;
  } else {
    const cloudEdge = teamEdges[cloudEdgeIndex];
    const needsCloudEdgeNormalization =
      cloudEdge.name !== 'operates' ||
      cloudEdge.relation !== 'oneToMany' ||
      cloudEdge.show !== true;

    if (needsCloudEdgeNormalization) {
      print('Normalizing existing team cloud edge to operates oneToMany...');
      teamEdges[cloudEdgeIndex] = {
        ...cloudEdge,
        collection: 'cloud',
        name: 'operates',
        relation: 'oneToMany',
        show: true,
        titleInbound: cloudEdge.titleInbound || 'Operated by',
      };

      db.collectionConfig.updateOne(
        { collection: 'team' },
        {
          $set: {
            edges: teamEdges,
          },
        },
      );
      migrated = true;
    } else {
      print('Team already has cloud operates edge, skipping...');
    }
  }

  const hasCloudConnected = Array.isArray(teamConfig.connectedTable) && teamConfig.connectedTable.some(
    (ct) => ct.collection === 'cloud',
  );

  if (!hasCloudConnected) {
    print('Adding cloud to team connectedTable...');
    db.collectionConfig.updateOne(
      { collection: 'team' },
      {
        $push: {
          connectedTable: { collection: 'cloud', direction: 'downstream' },
        },
      },
    );
    migrated = true;
  }
}

// Update serviceInstance collection config to add openshiftProject installation edge if not present
const serviceInstanceConfig = db.collectionConfig.findOne({ collection: 'serviceInstance' });
if (serviceInstanceConfig) {
  const hasOpenshiftInstallationEdge = serviceInstanceConfig.edges.some(
    (edge) => edge.name === 'installation' && edge.collection === 'openshiftProject',
  );

  if (!hasOpenshiftInstallationEdge) {
    print('Adding openshiftProject installation edge to serviceInstance collection configuration...');
    db.collectionConfig.updateOne(
      { collection: 'serviceInstance' },
      {
        $push: {
          edges: {
            id: 'b4056650',
            collection: 'openshiftProject',
            name: 'installation',
            titleInbound: 'Installs',
            relation: 'oneToMany',
            restrict: true,
            show: true,
          },
        },
      },
    );
    migrated = true;
  } else {
    print('serviceInstance already has openshiftProject installation edge, skipping...');
  }
}

// Replace graph permissions to grant cloud access through team edges
const deletedLegacyPermissions = db.graphPermission.deleteMany({
  key: { $in: ['leaddev-project-namespace', 'fullacc-project-namespace'] },
});
if (deletedLegacyPermissions.deletedCount > 0) {
  print(`Removed ${deletedLegacyPermissions.deletedCount} legacy namespace graph permission(s)...`);
  migrated = true;
}

const graphPermissionsToAdd = [
  {
    key: 'leaddev-team-cloud',
    name: 'user',
    data: [
      { name: 'lead-developer', index: 6, permissions: [] },
      { name: 'operates', index: 9, permissions: ['sudo', 'update'] },
    ],
  },
  {
    key: 'fullacc-team-cloud',
    name: 'user',
    data: [
      { name: 'full-access', index: 6, permissions: [] },
      { name: 'operates', index: 9, permissions: ['sudo', 'update'] },
    ],
  },
];

graphPermissionsToAdd.forEach((perm) => {
  const writeResult = db.graphPermission.updateOne(
    { key: perm.key },
    { $set: perm },
    { upsert: true },
  );

  if (writeResult.modifiedCount > 0 || writeResult.upsertedCount > 0) {
    print(`Upserting graph permission: ${perm.key}...`);
    migrated = true;
  } else {
    print(`Graph permission ${perm.key} already exists, skipping...`);
  }
});

if (migrated) {
  print('\n=== Migration completed successfully ===');
  print('New collections added: cloud, openshiftProject');
  print('Team collection updated with operates edge to cloud');
  print('Graph permissions added for cloud access through teams');
} else {
  print('\n=== No migration needed - all configurations already exist ===');
}
