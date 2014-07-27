Minineo4j = {};

var callInCallbackOrThrow = function (err, cb) {
	if (cb) cb(err);
	else throw err;
};

var throwNotImplementedError = function (cb) {
	var err =
	new Error("The called method is not available in minineo4j implementation");
	callInCallbackOrThrow(err, cb);
};

var throwNotImplementedError = function (cb) {
	var err =
	new Error("The called method is not available in minineo4j implementation");
	callInCallbackOrThrow(err, cb);
};

var translateToOrderedCallbacks = function (orderedCallbacks) {
  var queryResult = [];
  return {
    added: function (doc) {
      var pos = insPos(queryResult, doc._id);
      var before = pos === queryResult.length ? null : queryResult[pos];
      queryResult.splice(pos, 0, doc._id);
      orderedCallbacks.addedAt && orderedCallbacks.addedAt(doc, pos, before);
    },
    changed: function (newDoc, oldDoc) {
      var pos = insPos(queryResult, newDoc._id) - 1;
      orderedCallbacks.changedAt && orderedCallbacks.changedAt(newDoc, oldDoc, pos);
    },
    removed: function (doc) {
      var pos = insPos(queryResult, doc._id) - 1;
      queryResult.splice(pos, 1);
      orderedCallbacks.removedAt && orderedCallbacks.removedAt(doc, pos);
    }
  };
};

var translateToChangesCallbacks = function (changesCallbacks) {
  var newCallbacks = {};

  if (changesCallbacks.added)
    newCallbacks.added = function (doc) {
      var id = doc._id;
      delete doc._id;
      changesCallbacks.added(id, doc);
    };
  if (changesCallbacks.addedAt)
    newCallbacks.addedAt = function (doc, atIndex, before) {
      var id = doc._id;
      delete doc._id;
      changesCallbacks.addedBefore(id, doc, before);
    };

  var changedCallback = function (newDoc, oldDoc) {
    var id = newDoc._id;
    delete newDoc._id;
    // effectively the diff document is just {value} doc, as there is always
    // a single top-level field with the value
    changesCallbacks.changed(id, newDoc);
  };
  if (changesCallbacks.changed)
    newCallbacks.changed = changedCallback;
  if (changesCallbacks.changedAt)
    newCallbacks.changedAt = changedCallback;

  var removedCallback = function (doc) {
    changesCallbacks.removed(doc._id);
  };
  if (changesCallbacks.removed)
    newCallbacks.removed = removedCallback;
  if (changesCallbacks.removedAt)
    newCallbacks.removedAt = removedCallback;

  return newCallbacks;
};

// an index
Minineo4j.Cursor = function (graphIndex) {
	var self = this;
	self.graphIndex = graphIndex;
};

Minineo4j.unsupportedMethods = ["execute", "query", "reviveJSON", "fromJSON", "queryNodeIndex"];

_.each(Minineo4j.unsupportedMethods, function (method) {
	Minineo4j.GraphIndex.prototype[method] = throwNotImplementedError;
});

// A main store class
Minineo4j.GraphIndex = function (name) {
	var self = this;

	self.name = name;

	// main key-value storage
	self._graph = new Graph(); // TODO pass data to initialize
	// fine-grained reactivity per key
	// KEYS ARE NODE/REL IDS
	// n + id or r + id
	self._keyDependencies = {}
	// originals saved in-between calls to saveOriginals and
	// retrieveOriginals
	self._savedOriginals = null;
	// list of observers on cursors
	self.observes = [];

	// True when observers are paused and we should not send callbacks.
	self.paused = false;
};

Minineo4j.GraphIndex.prototype.pauseObservers = function () {
  var self = this;
  // XXX pauseObservers fails silenty if nested?
  // No-op if already paused.
  if (self.paused)
   return;

  // Set the 'paused' flag such that new observer messages don't fire.
  self.paused = true;

  // Take a snapshot of the query results
  self._graph = new Graph(self._graph); // TODO will break;
};

// Resume the observers. Observers immediately receive change
// notifications to bring them to the current state of the
// database. Note that this is not just replaying all the changes that
// happened during the pause, it is a smarter 'coalesced' diff.
Minineo4j.GraphIndex.prototype.resumeObservers = function () {
  var self = this;
  // No-op if not paused.
  if (! self.paused)
   return;

  // Unset the 'paused' flag. Make sure to do this first, otherwise
  // observer methods won't actually fire when we trigger them.
  self.paused = false;

  // Diff the current results against the snapshot and send to observers.
  self._graph._diffQueryChanges(_.bind(self._notifyObserves, self));

  // XXX Should we just always use a CowIdMap?
  self._graph = self._graph.flatten(); // TODO

  // XXX Do we need observeQueue (should we put it into a common class)
  //self._observeQueue.drain();
};

_.extend(Minineo4j.Cursor.prototype, {
	// probably wrong
	forEach: function(callbacks) {
		var self = this;
		return self.graphIndex.forEach(callbacks);
	},
	map: function(callbacks) {
		var self = this;
		return self.graphIndex.map(callbacks);
	},
	fetch: function () {
		var self = this;
		return self.graphIndex.elements;
	},
	count: function () {
		var self = this;
    	// XXX Inefficient
    	return self.fetch().length;
	},
	observe: function (callbacks) {
		var self = this;

		if (callbacks.addedAt || callbacks.changedAt || callbacks.removedAt || callbacks.movedTo) {
			return self.observe(translateToOrderedCallbacks(callbacks));
		}

		var observeRecord = _.extend({ pattern: self.pattern }, callbacks);
		var graphIndex = self.graphIndex;
		graphIndex.observes.push(observeRecord);

	    // XXX it is very important here to sort things in the same order they would
	    // be sorted by the query definition (right now there is only one default
	    // order).
		var docsInOrder = graphIndex.patternFetch(self.pattern).sort(function (a, b) {
			return a.key.localeCompare(b.key);
		});
		_.each(docsInOrder, function (kv) {
			callbacks.added && callbacks.added({ _id: kv.key, value: kv.value  });
		});

		return {
			stop: function () {
				graphIndex.observes = _.filter(graphIndex.observes, function (obs) {
					return obs !== observeRecord;
				});
			}
		};
	},
	observeChanges: function (callbacks) {
		var self = this;

		if (callbacks.addedBefore || callbacks.movedBefore) {
			return self.observe(translateToChangesCallbacks(translateToOrderedCallbacks(callbacks)));
		}

		return self.observe(translateToChangesCallbacks(callbacks));
	},
	_getCollectionName: function () {
		var self = this;
		return self.graphIndex.name;
	}
});


var callInCallbackAndReturn = function (res, cb) {
  cb && Meteor.defer(function () { cb(undefined, res); });
  return res;
};

var callInCallbackOrThrow = function (err, cb) {
  if (cb) cb(err);
  else throw err;
};

var maybePopCallback = function (args) {
  return _.isFunction(_.last(args)) ? args.pop() : undefined;
};

_.extend(Minineo4j.GraphIndex.prototype, {
	// -----
	// convinience wrappers
	// -----
	_keyDep: function (key) {
	  var self = this;

	  if (! self._keyDependencies[key])
	    self._keyDependencies[key] = new Deps.Dependency();

	  if (Deps.active) {
	    // for future clean-up
	    Deps.onInvalidate(function () {
	      self._tryCleanUpKeyDep(key);
	    });
	  }

	  return self._keyDependencies[key];
	},
	_has: function (key) {
	  var self = this;
	  self._keyDep(key).depend();
	  return self._kv.has(key);
	},
	_get: function (key) {
	  var self = this;
	  self._keyDep(key).depend();
	  return self._kv.get(key);
	},
	_set: function (key, value) {
	  var self = this;
	  var oldValue = self._kv.has(key) ? self._kv.get(key) : undefined;
	  self._kv.set(key, value);

	  self._saveOriginal(key, oldValue);
	  if (!self.paused && oldValue !== value) {
	    if (oldValue === undefined) {
	      self._notifyObserves(key, 'added', value);
	    } else {
	      self._notifyObserves(key, 'changed', value, oldValue);
	    }
	  }
	},

	_remove: function (key) {
	  var self = this;
	  if (! self._kv.has(key))
	    return;
	  var oldValue = self._kv.get(key);
	  self._saveOriginal(key, oldValue);
	  self._kv.remove(key);
	  if (!self.paused)
	    self._notifyObserves(key, 'removed', oldValue);
	},

	_tryCleanUpKeyDep: function (key) {
	  var self = this;
	  if (self._keyDependencies[key] && ! self._keyDependencies[key].hasDependents())
	    delete self._keyDependencies[key];
	},

	_notifyObserves: function (key, event, value, oldValue) {
	  var self = this;

	  self._keyDep(key).changed();
	  if (event === "removed") {
	    self._tryCleanUpKeyDep(key);
	  }

	  if (event !== "changed") {
	    _.each(self._patternDependencies, function (dep, pattern) {
	      if (key.match(patternToRegexp(pattern))) {
	        dep.changed();
	      }
	    });
	  }

	  _.each(self.observes, function (obs) {
	    if (! key.match(patternToRegexp(obs.pattern)))
	      return;
	    if (event === "changed") {
	      obs[event] && obs[event]({ _id: key, value: value },
	                               { _id: key, value: oldValue });
	    } else {
	      obs[event] && obs[event]({ _id: key, value: value });
	    }
	  });
	},

	_drop: function () {
	  var self = this;
	  self._kv.forEach(function (value, key) {
	    self._remove(key);
	  });
	},

	// -----
	// main interface built on top of Node-neo4j
	// -----

	// map functions of GraphIndex to _graph
	createNode:function(data) {
		var self = this;
		var n = self._graph.createNode(data);
		self._set("n"+n.id, n);
	},
	getNodeById:function(id) {
		var self = this;
		self._graph.getNodeById(id);
	},
	getIndexedNode:function(index, property, value, cb){
		var self = this;
		self._graph.getIndexedNode(index, property, value, cb);
	},
	getIndexedNodes:function(index, property, value, cb){
		var self = this;
		self._graph.getIndexedNodes(index, property, value, cb);
	},
	getRelationshipById:function(id){
		var self = this;
		self._graph.getRelationshipById(id);
	},
	getIndexedRelationship:function(index, property, value, cb){
		var self = this;
		self._graph.getIndexedRelationship(index, property, value, cb);
	},
	getNodeIndex:function(cb){
		var self = this;
		self._graph.getNodeIndex(cb);
	},
	createNodeIndex:function(name, config, cb){
		var self = this;
		self._graph.createNodeIndex(name, config, cb);
	},
	deleteNodeIndex:function(name, cb){
		var self = this;
		self._graph.deleteNodeIndex(name, cb);
	},
	getRelationshipIndexes:function(cb){
		var self = this;
		self._graph.getRelationshipIndexes(cb);
	},
	createRelationshipIndex:function(name, config, cb){
		var self = this;
		self._graph.createRelationshipIndex(name, config, cb);
	},
	deleteRelationshipIndex:function(name, cb){
		var self = this;
		self._graph.deleteRelationshipIndex(name, cb);
	}
});
