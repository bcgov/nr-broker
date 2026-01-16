// Migration script to add skipInstallBuildValidation field to brokerAccount collectionConfig
// Run this script using:
// mongosh mongodb://mongoadmin:secret@localhost:27017/brokerDB?authSource=admin
// < add-skip-install-build-validation-config.js

/* eslint-disable no-undef */

// Switch to brokerDB
use('brokerDB');

// Add skipInstallBuildValidation field to brokerAccount collectionConfig
let result = db.collectionConfig.updateOne(
  { collection: 'brokerAccount' },
  {
    $set: {
      'fields.skipInstallBuildValidation': {
        name: 'Skip Install Build Validation',
        required: true,
        type: 'boolean',
        hint: 'Allow installs to proceed without validating the build version exists',
        value: false,
      },
    },
  },
);

if (result.modifiedCount > 0) {
  print('Successfully added skipInstallBuildValidation to brokerAccount collectionConfig');
} else if (result.matchedCount > 0) {
  print('brokerAccount collectionConfig already has skipInstallBuildValidation field');
} else {
  print('ERROR: brokerAccount collectionConfig not found');
}

result = db.brokerAccount.updateMany(
  { skipInstallBuildValidation: { $exists: false } },
  { $set: { skipInstallBuildValidation: false } },
);

print(`Updated ${result.modifiedCount} broker account(s) with skipInstallBuildValidation field`);

// Verify the update
const count = db.brokerAccount.countDocuments({ skipInstallBuildValidation: { $exists: true } });
print(`Total broker accounts with skipInstallBuildValidation field: ${count}`);
