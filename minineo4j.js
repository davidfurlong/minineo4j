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


// an index
Minineo4j.Cursor = function (GraphIndex) {
	var self = this;
	self.graphIndex = graphIndex;
};

Minineo4j.unsupportedMethods = ["execute", "query", "reviveJSON", "fromJSON"];

_.each(Minineo4j.unsupportedMethods, function (method) {
	Minineo4j.graphStore.prototype[method] = throwNotImplementedError;
});


// A main store class
Minineo4j.GraphIndex = function (name) {
	var self = this;

	self.name = name;

	// main key-value storage
	self._graph = new Graph(); // TODO pass data to initialize
	// fine-grained reactivity per key
	self._keyDependencies = {};
	// fine-grained reactivity per non-trivial pattern
	self._patternDependencies = {};
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
		return self.GraphIndex.forEach(callbacks);
	},
	map: function(callbacks) {
		var self = this;
		return self.GraphIndex.map(callbacks);
	},
	fetch: function () {
		var self = this;
		return self.GraphIndex.elements;
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