/* eslint-disable no-undef */

const syncQueueConfigs = [
  {
    queue: 'GITHUB_SYNC_SECRETS',
    label: 'GitHub secrets',
    summary: 'Sync tools secrets to repository for CI/CD pipelines.',
    types: ['secrets'],
    description: [
      `The secrets sync copies service tool secrets from Vault to a repository's GitHub secrets. ` +
        `Secrets are transferred with the same names as in Vault; however, they may be modified to ` +
        `comply with GitHub's naming restrictions. To avoid issues during transfer, please refer to ` +
        `GitHub's secret naming restrictions when creating tool secrets.`,
      'Since multiple services can be linked to the same repository, the secrets sync may copy ' +
        'multiple tool secrets to a single GitHub repository.',
      'Broker\'s GitHub App must have been granted access to the repository before enabling sync.',
    ],
    requires: {
      envAll: ['GITHUB_SYNC_CLIENT_ID', 'GITHUB_SYNC_PRIVATE_KEY'],
    },
  },
  {
    queue: 'GITHUB_SYNC_USERS',
    label: 'GitHub user access',
    summary: 'Use team roles to setup user access to repository.',
    types: ['users'],
    setup: {
      gitHubUserLink: true,
    },
    description: [
      'This automates granting repository user access. Broker maps team roles to GitHub repository roles so the right users get the right access.',
      'Broker\'s GitHub App must have been granted access to the repository before enabling sync.',
    ],
    requires: {
      envAll: ['GITHUB_SYNC_CLIENT_ID', 'GITHUB_SYNC_PRIVATE_KEY'],
    },
  },
  {
    queue: 'KUBERNETES_SYNC_SECRETS',
    label: 'OpenShift secrets',
    summary: 'Sync tools secrets from deployed service secrets to OpenShift secrets.',
    types: ['secrets'],
    description: [
      'This enables the use of tools secrets in OpenShift projects without having to manually copy them.',
      'A typical use case is syncing CI/CD tool secrets. The graph must be configured to connect the project to a service instance.',
      'Secrets are copied into the target OpenShift project with the same names used in Broker.',
    ],
  },
];

const collectionSyncQueuesByCollection = {
  brokerAccount: [
    {
      traverse: {
        collection: 'repository',
        direction: 'downstream',
        maxDepth: 8,
        queues: ['GITHUB_SYNC_SECRETS'],
      },
    },
  ],
  team: [
    {
      traverse: {
        collection: 'repository',
        direction: 'downstream',
        maxDepth: 8,
        queues: ['GITHUB_SYNC_SECRETS', 'GITHUB_SYNC_USERS'],
      },
    },
    {
      traverse: {
        collection: 'openShiftProject',
        direction: 'downstream',
        maxDepth: 8,
        queues: ['KUBERNETES_SYNC_SECRETS'],
      },
    },
  ],
  repository: [
    {
      queue: {
        queue: 'GITHUB_SYNC_SECRETS',
        queuedStatusProperty: 'syncSecretsStatus',
      },
    },
    {
      queue: {
        queue: 'GITHUB_SYNC_USERS',
        queuedStatusProperty: 'syncUsersStatus',
      },
    },
  ],
  cloud: [
    {
      traverse: {
        collection: 'openShiftProject',
        direction: 'downstream',
        maxDepth: 4,
        queues: ['KUBERNETES_SYNC_SECRETS'],
      },
    },
  ],
  openShiftProject: [
    {
      queue: {
        queue: 'KUBERNETES_SYNC_SECRETS',
        requiredEnabledProperty: 'enableSyncSecrets',
        queuedStatusProperty: 'syncSecretsStatus',
      },
    },
  ],
};

Object.entries(collectionSyncQueuesByCollection).forEach(
  ([collection, syncQueues]) => {
    const result = db.collectionConfig.updateOne(
      { collection },
      { $set: { syncQueues } },
    );

    print(
      `collection=${collection} matched=${result.matchedCount} modified=${result.modifiedCount}`,
    );
  },
);

db.syncQueueConfig.deleteMany({});
db.syncQueueConfig.insertMany(syncQueueConfigs);
db.syncQueueConfig.createIndex({ queue: 1 }, { unique: true });
