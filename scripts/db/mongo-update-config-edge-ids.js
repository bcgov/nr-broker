/* eslint-disable no-undef */
db.collectionConfig.find().forEach((doc) => {
  if (!doc.edges) {
    doc.edges = [];
  }
  for (let edge of doc.edges) {
    var shortId = Math.random().toString(36).substr(2, 7); // Generates a random 7-character alphanumeric string
    edge.id = shortId;
  }
  db.collectionConfig.replaceOne({ _id: doc._id }, doc);
});
