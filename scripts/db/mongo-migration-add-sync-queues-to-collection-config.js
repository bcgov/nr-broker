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
    summary: 'Sync Vault tool secrets from authorized services to OpenShift project secrets.',
    types: ['secrets'],
    description: [
      'This enables the use of tools secrets in OpenShift projects without having to manually copy them. A typical use case is syncing CI/CD secrets.',
      'Sync configuration is read from Vault at the path clouds/<cloud>/<project>/nr-broker-sync and must include a service account token, a secrets mapping array, and optionally a CA certificate.',
      'Each mapping references a service by name that must have a deploys edge to the target cloud or OpenShift project. Secrets are read from the tools/<project>/<service> path in Vault and written as an OpenShift secret. An optional key mapping can rename keys on the way.',
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
        collection: 'openshiftProject',
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
        collection: 'openshiftProject',
        direction: 'downstream',
        maxDepth: 4,
        queues: ['KUBERNETES_SYNC_SECRETS'],
      },
    },
  ],
  openshiftProject: [
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
