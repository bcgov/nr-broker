// Utility script to remove a provenance type from every item in a collection
//
// Edit COLLECTION and PROVENANCE_TYPE below, then run:
//   mongosh mongodb://mongoadmin:secret@localhost:27017/brokerDB?authSource=admin \
//     --file scripts/db/mongo-remove-provenance-type.js
//
// Vertices live in the `vertex` collection and are filtered by their
// `collection` field. Edges are in the `edge` collection and are matched by
// their source (outbound) or target (inbound) vertex. Set DRY_RUN to false to apply the change.

/* eslint-disable no-undef */

const COLLECTION = 'project';
const PROVENANCE_TYPE = 'catalog'; // manual | catalog | intention | opensearch
const REMOVE_OUTBOUND_EDGES = true; // edges whose source is a matching item
const REMOVE_INBOUND_EDGES = false; // edges whose target is a matching item
const DRY_RUN = false;

use('brokerDB');

const filter = {
  collection: COLLECTION,
  provenance: { $elemMatch: { type: PROVENANCE_TYPE } },
};

print(
  `Removing provenance type '${PROVENANCE_TYPE}' from '${COLLECTION}' items...`,
);

const vertexIds = db.vertex
  .find({ collection: COLLECTION }, { _id: 1 })
  .toArray()
  .map((v) => v._id);

const typeMatch = { provenance: { $elemMatch: { type: PROVENANCE_TYPE } } };
const pullType = { $pull: { provenance: { type: PROVENANCE_TYPE } } };

const targets = [{ label: 'item', coll: db.vertex, filter }];
if (REMOVE_OUTBOUND_EDGES) {
  targets.push({
    label: 'outbound edge',
    coll: db.edge,
    filter: { source: { $in: vertexIds }, ...typeMatch },
  });
}
if (REMOVE_INBOUND_EDGES) {
  targets.push({
    label: 'inbound edge',
    coll: db.edge,
    filter: { target: { $in: vertexIds }, ...typeMatch },
  });
}

for (const { label, coll, filter: f } of targets) {
  const matching = coll.countDocuments(f);
  print(`  ${matching} ${label}(s) have this provenance type`);
  if (!DRY_RUN) {
    const result = coll.updateMany(f, pullType);
    print(`  Updated ${result.modifiedCount} ${label}(s)`);
  }
}

if (DRY_RUN) {
  print('Dry run: no changes made. Set DRY_RUN to false to apply.');
}

print('Done.');
