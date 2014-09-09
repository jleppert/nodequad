var O        = require('observed'),
	_        = require('lodash'),
	events   = require('eventemitter2'),
	util	 = require('util'),
	objPath  = require('object-path'),
	commands = require('./commands');

var commandMapping = {},
	methodMapping  = {};

Object.keys(commands).forEach(function forEachCommand(k) {
	if(commands[k].commands.method != undefined) {
		methodMapping[k] = commands[k];
	}

	if(!commands[k].mapping) return;
	commands[k].mapping.forEach(function forEachCommandMapping(map) {
		if(Array.isArray(map)) {
			map.forEach(function forEachMapItem(mapItem) {
				if(!mapItem.call) commandMapping[mapItem] = { name: k, desc: commands[k] };
			});
		} else {
			commandMapping[map] = { name: k, desc: commands[k] };
		}
	});
});

var AQ32Protocol = module.exports = function AQ32Protocol(aq, root) {
	events.EventEmitter2.call(this, { wildcard: true });

	this.aq = aq, this.root = root,
	this.ee = { config: O(this.root.config), state: O(this.root.state) },
	this.streams = {},
	this.activeStreams = [];

	var self = this;
	this.ee.listeners = {
		config: function callListener(ev) { handleConfigChanges.call(self, ev) },
		state:  function callListener(ev) { handleStateChanges.call(self, ev) }
	};

	Object.keys(methodMapping).forEach(function forEachMethodToMap(methodName) {
		self.root.methods[methodName] = function callMappedMethod() {
			self.commandQueue.push({
				type: 'method',
				command: methodMapping[methodName]
			});
		};
	});

	//console.dir(this.root.methods);

	this.ee.config.on('change', this.ee.listeners.config);
	
	//this.ee.state.on('change', this.handleStateChanges());

	this.commandQueue = [];
	Array.observe(this.commandQueue, this.handleCommands());
	
	//this.subscribe('state.something');
};
util.inherits(AQ32Protocol, events.EventEmitter2);

function handleConfigChanges(ev) {
	var command = commandMapping['config.' + ev.path];

	if(ev.type === 'update') {
		if(command.desc.commands.setter) {
			this.commandQueue.push({
				type: 'setter',
				command: command,
				path: ev.path,
				val: ev.value
			});
			this.commandQueue.push({
				type: 'method',
				command: commands.WriteEEPROM,
				path: 'config.' + ev.path
			});
		}
	}
}

function handleStateChanges(events) {
	var ev;
	while(ev = events.shift()) {
		//console.log('called config change!!');
		//console.dir(ev);
	}
}

AQ32Protocol.prototype.sync = function sync(path) {
	var self = this;

	findCommandsByPath(self.root, path).forEach(function forEachCommand(command) {
		self.commandQueue.push({
			type: 'getter',
			command: command,
			path: path
		});
	});
};

function findCommandsByPath(root, path) {
	if(path.match(/\.\*$/g)) path = path.substring(0, path.length - 2);

	function recurse(_root, path, loc) {
		var obj  = path ? objPath.get(_root || root, path) : _root,
			loc  = loc ? loc : path,
			commands = [];

		if(typeof(obj) === 'object') {
			Object.keys(obj).forEach(function forEachObjectProperty(k) {
				if(typeof(obj[k]) === 'object' && !Array.isArray(obj[k])) {
					commands.push(recurse(obj[k], null, path + '.' + k));
				} else {
					if(commandMapping[loc]) commands.push(commandMapping[loc]);
					var dotPath = loc + '.' + k;
					if(commandMapping[dotPath]) commands.push(commandMapping[dotPath]);
				}
			});
		} else {
			commands.push(commandMapping[path]);
		}
		return commands;
	}

	//console.log(root, path);

	var dup = {};
	return _.flatten(recurse(undefined, path)).filter(function filterBy(cmd) {
		if(dup[cmd.name] || cmd === undefined) return false;
		dup[cmd.name] = cmd;
		return true;
	});
}

AQ32Protocol.prototype.handleCommands = function recs() {
	var self = this;

	return function commandEventHandler(events) {
		var ev;
		while(ev = events.shift()) {
			if(ev.type === 'splice') {
				var queueItem = ev.object[ev.index];
				if(queueItem.type === 'getter') {
					var c = queueItem.command.desc;
					(function handleGetterCommand(c, queueItem) {
						self.aq.getDriver().send(c.commands.getter, c.lines, function handleGetterCommandCb(sent, recv) {
							//console.log('recv:', recv);
							//console.log('data', c.parser.call(c, recv));
							updateState.call(self, c.parser.call(c, recv));
						});
					}(c, queueItem));
				} else if(queueItem.type === 'setter') {
					var c = queueItem.command.desc;
					
					(function handleSetterCommand(c, queueItem) {
						var commandData = c.parser.setter.call(c, queueItem.path, queueItem.val, self.root);
						self.aq.getDriver().send(commandData);
					}(c, queueItem));
				} else if(queueItem.type === 'method') {
					self.aq.getDriver().send(queueItem.command.commands.method);
					self.sync(queueItem.path);
				}
			}
		}
	}
};

var streamMapping = {
	'readable': ReadableObjectStream
};

AQ32Protocol.prototype.stream = function stream(path) {
	var self = this,
	    driverStream = self.aq.getDriver().getStream();

	findCommandsByPath(this.root, path).forEach(function setupStream(command) {
		console.log('setup stream', command);
		var c = command.desc;
		if(self.streams[command.name] === undefined && c.commands.stream) {
			self.streams[command.name] = new streamMapping[c.stream](self, c);
			console.dir(self.streams);
			self.activeStreams.push(self.streams[command.name]);
			self.streams[command.name].on('data', function streamDataCb(obj) {
				// copy over props from stream to root object
				_.assign(self.root, obj);
			});
		}
	});

	if(!this.streaming) this.streaming = multiplexStreams();

	function multiplexStreams() {
		var samples = 0;
		function sampled() {
			if(samples > AQ32Protocol.STREAM_MUX_SAMPLES && self.activeStreams.length > 0) {
				// unpipe first stream
				driverStream.unpipe(self.activeStreams[0]);
				// set the oldest pending stream as active on the stack
				self.activeStreams.shift(self.activeStreams.pop());
				// send the command character to the driver
				self.aq.getDriver().send(self.activeStreams[0].command.commands.stream, 0, function nextStream() {
					// pipe the output to this stream
					driverStream.pipe(self.activeStreams[0]);
					// reset samples
					samples = 0;
				});
			} else {
				samples++;
			}
		}

		self.activeStreams[0].on('data', sampled);
		driverStream.pipe(self.activeStreams[0]);
		self.aq.getDriver().send(self.activeStreams[0].command.commands.stream);

		return true;
	}
};

// have a loop that does while (there are still streams that need to be streamed)
// push commands onto the stream 

AQ32Protocol.prototype.pauseStream = function pauseStream(path) {
	var self = this;

	findCommandsByPath(this.root, path).forEach(function pauseStreamByCommand(command) {
		if(self.streams[command] != undefined) {
			// unpipe
			self.aq.getDriver().getStream().unpipe(self.streams[command]);
			// remove all listeners
			self.streams[command].removeAllListeners();
			// remove from array
			self.activeStreams.splice(self.activeStreams.indexOf(self.streams[command]), 1);
			// delete from hash
			delete self.streams[command];
		}
	});

	// check array and reset streaming condition
	if(this.activeStreams.length === 0) this.streaming = false;
};

function updateState(parsedData) {
	var self = this;

	this.ee.config.removeListener('change', this.ee.listeners.config);
	this.ee.state.removeListener('change', this.ee.listeners.state);

	Object.keys(parsedData).forEach(function updateStateFromParsedData(key) {
		objPath.set(self.root, key, parsedData[key]);
		self.emit.call(self, key, key, parsedData[key]);
	});

	this.ee.config.deliverChanges();
	this.ee.state.deliverChanges();
	this.ee.config.on('change', this.ee.listeners.config);
	this.ee.state.on('change', this.ee.listeners.state);
}

var Transform = require('stream').Transform;

function ReadableObjectStream(protocol, command) {
  Transform.call(this, { objectMode: true });
  this.command  = command,
  this.protocol = protocol;
}
util.inherits(ReadableObjectStream, Transform);

ReadableObjectStream.prototype._transform = function _transform(line, encoding, done) {
	var parsedOutput = this.command.parser.call(this.command, line);
	updateState.call(this.protocol, parsedOutput);
	this.push(parsedOutput);
	done();
};