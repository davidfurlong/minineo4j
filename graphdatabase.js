// Graph DB in memory following the neo4j-node specs
/*

Todos:

Garbage Collection
Implement cypher and gremlin queries

*/


var __hasProp = {}.hasOwnProperty;

var Path = (function(start, end, length, nodes, relationships){
  function Path(start, end, length, nodes, relationships){
    this.start = start;
    this.end = end;
    this.len = length;
    this.nodes = nodes;
    this.relationships = relationships;
  }

  return Path;
})();

var Index = (function(name){
  // “An Index —maps from→ Properties —to either→ Nodes or Relationships”
  function Index(name){
    this.elements = []; // elements are either Nodes or relationships
    this.name = name;
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
    var temp = {};
    temp.data = this.data;
    temp.id = this.id;
    temp.start = this.start.id;
    temp.end = this.end.id;
    temp.type = this.type;
    temp.exists = this.exists;

    // seen = []

    // JSON.stringify(obj, function(key, val) {
    //    if (val != null && typeof val == "object") {
    //         if (seen.indexOf(val) >= 0)
    //             return
    //         seen.push(val)
    //     }
    //     return val
    // })
    return JSON.stringify(temp);
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
    var temp = {};
    temp.data = this.data;
    temp.id = this.id;
    temp.start = this.start.id;
    temp.end = this.end.id;
    temp.type = this.type;
    temp.exists = this.exists;
    return JSON.parse(temp);
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
    var temp = {};
    temp.data = this.data;
    temp.id = this.id;
    temp.exists = this.exists;
    temp.edgesOut = this.edgesOut.map(function(k){
      return k.id;
    });
    temp.edgesIn = this.edgesIn.map(function(k){
      return k.id;
    });
    return JSON.stringify(temp);
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
    this.graph._nodes[this.id] = null;

    cb();
    // need to delete references in Relationships & relationships between this node & another
    // need to delete reference in graph
  }
  Node.prototype.toJSON = function(){
    var temp = {};
    temp.data = this.data;
    temp.id = this.id;
    temp.exists = this.exists;
    temp.edgesOut = this.edgesOut.map(function(k){
      return k.id;
    });
    temp.edgesIn = this.edgesIn.map(function(k){
      return k.id;
    });
    return JSON.parse(temp);
  }
  Node.prototype.matchesFilter = function(filter, cb) {
    if(!this.exists)
      return false;
    return filter(this.data);
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
    var newE = new Edge(newEId,this, otherNode, type, this.graph)
    newE.data = data;
    this.edgesOut.push(newE);
    this.graph._edges[newEId] = newE;
    cb(newE);
  }
  Node.prototype.createRelationshipFrom = function(otherNode, type, data, cb) {
    var newEId = this.graph.generateEdgeId();
    var newE = new Edge(newEId, otherNode, this, type, this.graph)
    newE.data = data;
    this.edgesIn.push(newE);
    this.graph._edges[newEId] = newE;
    cb(newE);
  }
  Node.prototype.getRelationships = Node.prototype.all = function(type, cb){
    // todo use the below two methods instead
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
    return matches;
  }
  Node.prototype.getRelationshipsOut = function(type, cb){
    var matches = [];
    for(k in this.edgesOut){
      if(this.edgesIn[k].type == type)
        matches.push(this.edgesIn[k]);
    }
    cb(matches);
    return matches;
  }
  Node.prototype.getRelationshipsIn = function(type, cb){
    var matches = [];
    for(k in this.edgesIn){
      if(this.edgesIn[k].type == type)
        matches.push(this.edgesIn[k]);
    }
    cb(matches);
    return matches;
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
  // todo test this
  Node.prototype.getRelationshipNodes = function(rels, cb){
    if(typeof rels == 'string'){ // string
      // types
      this.getRelationships(rels, cb);
    }
    else if(typeof rels == 'object' && typeof rels[0] == 'string'){ // array of strings
      // types
      cb(rels.map(function(el){
        return this.getRelationships(el, function(e){return});
      }));
    }
    else if(typeof rels == 'object' && typeof rels[0] == 'undefined'){ // object
      if(!rels.hasOwnProperty('type')){
        console.error('Type of relation is required to search');
        return;
      }
      if(rels.hasOwnProperty('direction')){
        if(rels.direction == 'in'){
          this.getRelationshipsIn(rels.type, cb);
        }
        else if(rels.direction == 'out'){
          this.getRelationshipsOut(rels.type, cb);
        }
        else {
          console.error('Direction of relation search specified is invalid use "in" or "out"');
        }
      }
      else {
        this.getRelationships(rels.type, cb);
      }
    }
    else if(typeof rels == 'object' && typeof rels[0] == 'object'){ // array of objects
      cb(rels.map(function(el, i){
        console.log()
        if(!rels.hasOwnProperty('type')){
          console.error('Type of relation is required to search');
          return;
        }
        if(el.hasOwnProperty('direction')){
          if(el.direction == 'in'){
            return this.getRelationshipsIn(el.type, function(a){return});
          }
          else if(el.direction == 'out'){
            return this.getRelationshipsOut(el.type, function(a){return});
          }
          else {
            console.error('Direction of relation search specified is invalid use "in" or "out"');
          }
        }
        else {
          return this.getRelationships(el.type, function(a){return});
        }
      }));
    }
  }
  Node.prototype.path = function(to, type, direction, maxDepth, algorithm, cb){
    maxDepth = typeof maxDepth !== 'undefined' ? maxDepth : 1;
    algorithm = typeof algorithm !== 'undefined' ? algorithm : 'shortestPath';

    if(algorithm == 'DFS'){
      var s = new Path(this, this, 0,[this],[]);
      return this.graph.DFS(s, to);
    }
    else if(algorithm == 'shortestPath'){

    }
    else if(algorithm == 'BFS'){

    }
    else {
      console.error('This algorithm is unsupported. Supported are "DFS", "BFS" and "shortestPath" Feel free to add it and PR');
      return;
    }
    return;
  }

  return Node;
})();

var Graph,
  __hasProp = {}.hasOwnProperty;

Graph = (function() {
  function Graph(nodes, edges, nodeindexes, edgeindexes) {
    // this is the graphs primary index
    this._nodes = nodes !== undefined ? nodes : []; // indexed from 1
    this._edges = edges !== undefined ? edges : []; // indexed from 1
    this._nodeindexes = nodeindexes !== undefined ? nodeindexes : [];
    this._edgeindexes = edgeindexes !== undefined ? edgeindexes : [];
    var nodeMaxIndex = 0;
    if(nodeindexes !== undefined){
      for(k in nodeindexes){
        if(nodeindexes[k].id > nodeMaxIndex)
          nodeMaxIndex = nodeindexes[k].id;
      }
    }
    var edgeMaxIndex = 0;
    if(edgeindexes !== undefined){
      for(k in edgeindexes){
        if(edgeindexes[k].id > edgeMaxIndex)
          edgeMaxIndex = edgeindexes[k].id;
      }
    }
    this.nodeMaxIndex = nodeMaxIndex;
    this.edgeMaxIndex = edgeMaxIndex;
  }

  Graph.prototype.createNode = function(data) {
    var newNId = this.generateNodeId();
    var newN = new Node(newNId, data, this);
    this._nodes[newNId] = newN;
    return newN;
  }

  // Only allows traversal from relationship source to target
  Graph.prototype.DFS = function(path, destNode) {
    for (k in path.end.edgesOut){
      var nextN = path.end.edgesOut[k].end;
      var n = path.nodes.slice(0);
      var r = path.relationships.slice(0);
      n.push(nextN);
      r.push(path.end.edgesOut[k]);
      var p = new Path(path.start, nextN, path.len+1, n, r);
      if(nextN.id == destNode.id){
        console.log('FOUND');
        return p;
      }
      else if(path.nodes.indexOf(nextN) == -1){
        console.log('SEARCHING'+p+destNode)
        return this.DFS(p, destNode);
      }
    }
    console.log('DFS was unsuccessful');
    return -1; 
  }

  Graph.prototype.shortestPath = function() {

  }

  // todo test
  Graph.prototype.DFSUndirected = function() {
      for (k in path.end.edgesOut){
        var nextN = path.end.edgesOut[k].end;
        var n = path.nodes.slice(0);
        var r = path.relationships.slice(0);
        n.push(nextN);
        r.push(path.end.edgesOut[k]);
        var p = new Path(path.start, nextN, path.len+1, n, r);
        if(nextN.id == destNode.id){
          console.log('FOUND');
          return p;
        }
        else if(path.nodes.indexOf(nextN) == -1){
          console.log('SEARCHING'+p+destNode)
          return this.DFSUndirected(p, destNode);
        }
      }
      for (k in path.end.edgesIn){
        var nextN = path.end.edgesIn[k].end;
        var n = path.nodes.slice(0);
        var r = path.relationships.slice(0);
        n.push(nextN);
        r.push(path.end.edgesIn[k]);
        var p = new Path(path.start, nextN, path.len+1, n, r);
        if(nextN.id == destNode.id){
          console.log('FOUND');
          return p;
        }
        else if(path.nodes.indexOf(nextN) == -1){
          console.log('SEARCHING'+p+destNode)
          return this.DFSUndirected(p, destNode);
        }
      }
      console.log('DFS was unsuccessful');
      return -1; 
    }

  Graph.prototype.BFS = function(path, destNode) {
    // todo
  }

  Graph.prototype.shortestPath = function(prev, destNode) {
    // todo
  }

  Graph.prototype.getNodeById = Graph.prototype.getNode = function(id) {
    if(this._nodes[id] === undefined){
      console.error('Id is undefined');
      return;
    }
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
    cb(evaluateIndex(index, query));
    return evaluateIndex(index, query);
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
    // todo Not happenning, lucene queries and all
  }

  Graph.prototype.getNodeIndexes = function (cb) {
    cb(this._nodeindexes); // returns all
  }

  Graph.prototype.createNodeIndex = function (name, config, cb) {
    // ignores "config" which has default {}
    var i = new Index(name);
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
    if(obj.start === undefined){
      return this.getNodeById(obj.id);
    }
    else {
      return this.getRelationshipById(obj.id);
    }
  }

  Graph.prototype.reviveJSON = function (key, val) {
    // todo
  }

  Graph.prototype.query = function (query, params, cb) {
    // cypher
    // params defaults to {}
    // todo
  }

  Graph.prototype.execute = function (execute, params, cb) {
    // gremlin
    // not going to be implemented, realistically.
    // params defaults to {}
    // todo
  }

  Graph.prototype.generateEdgeId = function() {
    return ++this.edgeMaxIndex;
  }

  Graph.prototype.generateNodeId = function() {
    return ++this.nodeMaxIndex;
  }

  return Graph;
})();