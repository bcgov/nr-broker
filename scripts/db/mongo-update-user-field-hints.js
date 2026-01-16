/* eslint-disable no-undef */
/**
 * Update script to set field hints for the user collection config
 *
 * This script updates the user collection configuration to add hint text
 * for each field, providing users with guidance on what each field represents.
 *
 * Usage:
 *   mongosh mongodb://mongoadmin:secret@localhost:27017/broker?authSource=admin \
 *     --file scripts/db/mongo-update-user-field-hints.js
 */

print('Updating user collection config with field hints...');

const result = db.collectionConfig.updateOne(
  { collection: 'user' },
  {
    $set: {
      'fields.domain.hint': 'The authentication domain the user belongs to',
      'fields.email.hint': 'The email address of the user',
      'fields.guid.hint': 'The globally unique identifier for the user',
      'fields.name.hint': 'The full name of the user',
      'fields.username.hint': 'The unique username of the user',
    },
  },
);

if (result.matchedCount === 0) {
  print('ERROR: User collection config not found');
} else if (result.modifiedCount === 0) {
  print('User collection config found but no changes were made (hints may already exist)');
} else {
  print('Successfully updated user collection config with field hints');
}

print(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
