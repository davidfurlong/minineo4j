Package.describe({
  summary: "Meteor's client-side datastore: a port of Neo4j to Javascript",
  internal: true
});

Package.on_use(function (api) {
  api.export('Neo4j');
  api.use(['graphdatabase.js','deps', 'underscore', 'random', 'ejson']);
  api.add_files(['minineo4j.js']);
});