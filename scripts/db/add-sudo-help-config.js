// Migration script to add sudoHelp field to collection configs
// This script adds helpful descriptions for sudo permissions on collections
// Run this script using:
// mongosh mongodb://mongoadmin:secret@localhost:27017/brokerDB?authSource=admin
// < scripts/db/add-sudo-help-config.js

/* eslint-disable no-undef */

use('brokerDB');

const collections = [
  {
    collection: 'service',
    sudoHelp:
      'Sudo allows updates to protected service settings such as Vault integration fields.',
  },
  {
    collection: 'brokerAccount',
    sudoHelp:
      'Sudo allows elevated management of account-level access links that control downstream authorization.',
  },
  {
    collection: 'team',
    sudoHelp:
      'Sudo allows owner-level administrative actions on team configuration and ownership controls.',
  },
  {
    collection: 'repository',
    sudoHelp:
      'Sudo allows elevated repository operations such as secret and user synchronization controls.',
  },
];

let totalModified = 0;
let totalSkipped = 0;

for (const item of collections) {
  const result = db.collectionConfig.updateOne(
    { collection: item.collection },
    {
      $set: {
        sudoHelp: item.sudoHelp,
      },
    },
  );

  if (result.modifiedCount > 0) {
    print(
      `✓ Added sudoHelp to ${item.collection} collectionConfig`,
    );
    totalModified++;
  } else if (result.matchedCount > 0) {
    print(
      `○ ${item.collection} collectionConfig already has sudoHelp field`,
    );
    totalSkipped++;
  } else {
    print(`✗ ERROR: ${item.collection} collectionConfig not found`);
  }
}

print('');
print(`Migration complete: ${totalModified} collection(s) updated, ${totalSkipped} collection(s) skipped`);

// Verify the updates
const updated = db.collectionConfig.countDocuments({ sudoHelp: { $exists: true } });
print(`Total collection configs with sudoHelp field: ${updated}`);
