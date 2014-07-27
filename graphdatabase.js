// Graph DB in memory following the neo4j-node specs
// Todo Paths
// Issue equals is a javascript reserved keyword we use eq instead
// Collection = Index

var Path = (function(start, end, length, nodes, relationships, graph){
  function Path(start, end, length, nodes, relationships, graph){
    this.start = start;
    this.end = end;
    this.length = length;
    this.nodes = nodes;
    this.relationships = relationships;
    this.graph = graph;
  }
  return Path;
})();

var Index = (function(name, graph){
  // “An Index —maps from→ Properties —to either→ Nodes or Relationships”
  function Index(name, graph){
    this.elements = []; // elements are either Nodes or relationships
    this.name = name;
    this.graph = graph;
    this.exists = true;
  }

  Index.prototype.del = function() {
    this.exists = false;
  }

  Index.prototype.forEach = function(cb) {
    for(k in this.elements){
      cb(this.elements[k]);
    }
  }

  Index.prototype.map = function(cb) {
    for(k in this.elements){
      cb(this.elements[k]);
    }
    return this.elements;
  }

  return Index;
})();

var Edge = (function(id, inV, outV, type, graph){
  function Edge(id, inV, outV, type, graph){
    this.data = {};
    this.id = id;
    this.start = inV;
    this.end = outV;
    this.type = type;
    this.exists = true;
    this.graph = graph;
    // this.self;
  }

  Edge.prototype.toString = function(){
    return JSON.stringify(this);
  }
  Edge.prototype.save = function(_){
    return this;
  }
  Edge.prototype.index = function(index, key, value, _){
    // dubious
    index.elements.push(this);
    this.data[key] = value;
    _();
  }
  Edge.prototype.unindex = function(index, key, value, _){
    // dubious
    var index = array.indexOf(this);
    if (index > -1) {
        index.elements.splice(index, 1);
    }
    delete this.data[key];
    _();
  }
  Edge.prototype.del = function(cb){
    this.exists = false;
    cb();
  }
  Edge.prototype.toJSON = function(){
    return JSON.parse(this);
  }
  Edge.prototype.equals = function(other){
    return this.id == other.id;
  }

  return Edge;
})();

var Node = (function(id, data, graph){
  function Node(id, data, graph){
    this.data = data;
    this.id = id;
    this.exists = true;
    this.edgesOut = [];
    this.edgesIn = [];
    this.graph = graph;
    // this.self;
  }

  Node.prototype.toString = function(){
    return JSON.stringify(this);
  }
  Node.prototype.equals = function(other){
    return this.id == other.id && this.data == other.data && this.exists == other.exists && this.edgesOut == other.edgesOut && this.edgesIn == other.edgesIn && this.graph == other.graph
  }
  Node.prototype.save = function(){
    return this;
    // probably should do more than this;
  }
  Node.prototype.del = function(cb) {
    this.exists = false;
    cb();
    // need to delete references in Relationships & relationships between this node & another
    // need to delete reference in graph
  }
  Node.prototype.toJSON = function(){
    return JSON.parse(this);
  }
  Node.prototype.index = function(index, key, value, cb) {
    // dubious?

    index.elements.push(this);
    this.data[key] = value;
    cb();
  }
  Node.prototype.unindex = function(index, key, value, cb) {
    // dubious?
    var index = array.indexOf(this);
    if (index > -1) {
        index.elements.splice(index, 1);
    }
    delete this.data[key];
    cb();
  }
  Node.prototype.createRelationshipTo = function(otherNode, type, data, cb) {
    var newEId = this.graph.generateEdgeId();
    var newE = new Edge(newEId,this, otherNode, type)
    newE.data = data;
    this.edgesOut.push(newE);
    this.graph._edges[newEId] = newE;
    cb(newE);
  }
  Node.prototype.createRelationshipFrom = function(otherNode, type, data, cb) {
    var newEId = this.graph.generateEdgeId();
    var newE = new Edge(newEId, otherNode, this, type)
    newE.data = data;
    this.edgesIn.push(newE);
    this.graph._edges[newEId] = newE;
    cb(newE);
  }
  Node.prototype.getRelationships = Node.prototype.all = function(type, cb){
    var matches = [];
    for(k in this.edgesIn){
      if(this.edgesIn[k].type == type)
        matches.push(this.edgesIn[k]);
    }
    for(k in this.edgesOut){
      if(this.edgesIn[k].type == type)
        matches.push(this.edgesIn[k]);
    }
    cb(matches);
  }
  Node.prototype.outgoing = function(type, cb){
    var matches = [];
    for(k in this.edgesOut){
      if(this.edgesOut[k].type == type)
        matches.push(this.edgesOut[k]);
    }
    cb(matches);
  }
  Node.prototype.incoming = function(type, cb){
    var matches = [];
    for(k in this.edgesIn){
      if(this.edgesIn[k].type == type)
        matches.push(this.edgesIn[k]);
    }
    cb(matches);
  }
  Node.prototype.getRelationshipNodes = function(rels, cb){
    // todo options for rels are complex
  }
  Node.prototype.path = function(to, type, direction, maxDepth, algorithm, cb){
    maxDepth = typeof maxDepth !== 'undefined' ? maxDepth : 1;
    algorithm = typeof algorithm !== 'undefined' ? algorithm : 'shortestPath';
    // todo lots of work
  }

  return Node;
})();

var Graph,
  __hasProp = {}.hasOwnProperty;

Graph = (function() {
  function Graph() {
    // this is the graphs primary index
    this._nodes = []; // indexed from 1
    this._edges = []; // indexed from 1
    this._nodeindexes = [];
    this._edgeindexes = [];
    this.nodeMaxIndex = 0;
    this.edgeMaxIndex = 0;
  }

  Graph.prototype.createNode = function(data) {
    var newNId = this.generateNodeId();
    var newN = new Node(newNId, data, this);
    this._nodes[newNId] = newN;
    return newN;
  }

  Graph.prototype.getNodeById = Graph.prototype.getNode = function(id) {
    return this._nodes[id];
  }

  Graph.prototype.getIndexedNode = function (index, property, value, cb) {
    for(k in index.elements){
      if(index.elements[k].data.hasOwnProperty(property) && index.elements[k].data.property == value){
        cb(index.elements[k]);
        return;
      }
    }
    console.error('No such Node found');
    cb(null);
  }

  Graph.prototype.getIndexedNodes = function (index, property, value, cb) {
    var nodes = [];
    for(k in index.elements){
      if(index.elements[k].data.hasOwnProperty(this.property) && index.elements[k].data.property == value){
        nodes.push(index.elements[k]);
      }
    }
    cb(nodes);
  }

  Graph.prototype.queryNodeIndex = function (index, query, cb) {
    // requires Lucene query syntax
  }

  Graph.prototype.getRelationshipById = function (id, cb) {
    cb(this._nodes[id]);
  }

  Graph.prototype.getIndexedRelationship = function (index, property, value, cb) {
    for(k in index.elements){
      if(index.elements[k].data.hasOwnProperty(property) && index.elements[k].data.property == value){
        cb(index.elements[k]);
        return;
      }
    }
    console.error('No such Relationship found');
    cb(null);
  }

  Graph.prototype.getIndexedRelationships = function (index, property, value, cb) {
    var rels = [];
    for(k in index.elements){
      if(index.elements[k].data.hasOwnProperty(this.property) && index.elements[k].data.property == value){
        rels.push(index.elements[k]);
      }
    }
    cb(rels);
  }

  Graph.prototype.queryRelationshipIndex = function (index, query, cb) {
    // Not happenning, lucene queries and all
  }

  Graph.prototype.getNodeIndexes = function (cb) {
    cb(this._nodeindexes); // returns all
  }

  Graph.prototype.createNodeIndex = function (name, config, cb) {
    // ignores "config" which has default {}
    var i = new Index(name, this);
    this._nodeindexes.push(i);
    cb(i);
  }

  Graph.prototype.deleteNodeIndex = function (name, cb) {
    // slow 
    for(k in this._nodeindexes){
      // can delete multiple if names are not unique
      if(this._nodeindexes[k].name == name){
        this._nodeindexes[k].del();
        array.splice(k, 1);
      }
    }
    cb();
  }

  Graph.prototype.getRelationshipIndexes = function (cb) {
    cb(this._edgeindexes);
  }

  Graph.prototype.createRelationshipIndex = function (name, config, cb) {
    // ignores "config" which has default {}  
    var i = new Index(name, this);
    this._edgeindexes.push(i);
    cb(i);
  }

  Graph.prototype.deleteRelationshipIndex = function (name, cb) {
    for(k in this._edgeindexes){
      // can delete multiple if names are not unique
      if(this._edgeindexes[k].name == name){
        this._edgeindexes[k].del();
        array.splice(k, 1);
      }
    }
    cb();
  }

  Graph.prototype.fromJSON = function (obj) {

  }

  Graph.prototype.reviveJSON = function (key, val) {

  }

  Graph.prototype.query = function (query, params, cb) {
    // params defaults to {}
  }

  Graph.prototype.execute = function (execute, params, cb) {
    // not going to be implemented, realistically.
    // params defaults to {}

  }

  Graph.prototype.generateEdgeId = function() {
    return ++this.edgeMaxIndex;
  }

  Graph.prototype.generateNodeId = function() {
    return ++this.nodeMaxIndex;
  }

  return Graph;
})();