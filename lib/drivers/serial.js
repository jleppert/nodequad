var events      = require('events'),
	url         = require('url'),
	util		= require('util'),
	events      = require('eventemitter2'),
	serialPort  = require('serialport'),
	backOff     = require('backoff');

/**
 * Driver operational constants
 * @type {Object} constants
 */
const DEFAULT_BAUD = 115200,
	  // backoff type for retry of commands/connection
	  BACKOFF_TYPE = 'fibonacci',
	  // where to start timing out
	  MIN_TIMEOUT  = 500;
	  // when to give up
	  MAX_TIMEOUT  = 2000;
	  // maximum number of tries
	  MAX_RETRY_COUNT = 10,
	  // line timeout (time per line to allow)
	  LINE_TIMEOUT = function calcLineTimeout(l) { return l * 100; },
	  // serial buffer size
	  SERIAL_BUFFER_SIZE = 1024,
	  // probe timeout
	  PROBE_RESPONSE_TIMEOUT = 500,
	  // probe command
	  PROBE_COMMAND = '!',
	  // probe regexp
	  PROBE_REGEXP = /(?:\d*\.)?\d+/g;

/**
 * State events emitted during connection state changes. They can be monitored by attaching callbacks to the driver object: driver.on('state.disconnected', function() { .. });
 * States are available on the SerialDriver object (i.e. SerialDriver.states.DISCONNECTED)
 * @type {Object} observeable object
 */
const states = {
	DISCONNECTED: [0, 'state.disconnected'],
	CONNECTING:   [1, 'state.connecting'],
	CONNECTED:    [2, 'state.connected'],
	READY:        [3, 'state.ready'],
	TRANSMITTING: [4, 'state.transmitting'],
	RECEIVING:    [5, 'state.receiving'],
	BACKOFF:      [6, 'state.retry']
};
/**
 * SerialDriver object providing for stateful communication over a serial link. The SerialDriver provides support for command queuing, connection management, 
 * and automatic backoff/retrying. It has been designed to provide a reliable connection to the vehicle during flight.
 * @constructor
 * @param {string} uri           A URI to connect to (optional)
 */
var SerialDriver = module.exports = function SerialDriver(uri) {
	events.EventEmitter2.call(this, { wildcard: true });

	this.queue = [], this.backOffs = [], this.foundPorts = [];

	this.connection = {
		state: states.DISCONNECTED[0],
		driver: undefined,
		uri: {}
	};

	if(uri) {
		uri = url.parse(uri);

		var self = this;
		this.list(function checkURIByPortList(err, portList) {
			if(portList.filter(function(port) {
				return port.name === uri.pathname ? true : false;
			}).length) {
				self.connection.uri = url.parse(portList.pop().uri);
			} else {
				self.connection.uri = {};
			}
		});
	}

	this.backOff = backOff[BACKOFF_TYPE]({
		randomisationFactor: 0,
		initialDelay: MIN_TIMEOUT,
		maxDelay: MAX_TIMEOUT
	});

	this.backOff.on('backoff', function backOffLogger(number, delay) {
    	self.backOffs.push([number, delay]);
	});
	this.backOff.failAfter(MAX_RETRY_COUNT);

	this.backOff.on('fail', function onBackOffFail() {
		self.backOff.reset();
    	self.connection.state = states.DISCONNECTED[0];
    	self.connection.driver = undefined;
    	self.emit(states.DISCONNECTED[1]);
	});

	this.on('pong', function onPortPong(port) {
		this.foundPorts.push(port);
	});
	
	Array.observe(this.queue, function observeQueueEvents(events) {
		try {
			self.backOff.backoff();
		} catch(e) {}
	    self.connection.state = states.BACKOFF[0];
		self.emit(states.BACKOFF[1]);
		var item;
		while(item = self.queue.shift()) {
			(function applyBackOff(item) {
				self.backOff.once('ready', function onceBackoffReady() {
					self.connection.state = states.READY[0];
					self.send.apply(self, item);
				});
			}(item));
		}
	});

	setInterval(function pollConnectionState() {
		console.log(self.connection.state, self.queue);
	}, 2000);
};
util.inherits(SerialDriver, events.EventEmitter2);
SerialDriver.prototype.name = 'SerialDriver';
SerialDriver.states = {};
var stateIntegerMapping = {};
Object.keys(states).forEach(function(key) {
	SerialDriver.states[key] = states[key][1];
	stateIntegerMapping[states[key][0]] = states[key][1];
});


/**
 * Connect to the port
 * @param {String}   uri uri to connect (optional)
 * @param {Function} cb
 */
SerialDriver.prototype.connect = function connect(uri, cb) {
	var self = this;
	// use stored uri if there is one
	var uri = uri ? url.parse(uri) : (this.connection.uri ? this.connection.uri : undefined);
	if (uri === undefined) {
		cb.call(this, 'No URI available', undefined);
		return;
	}

	this.connection.state = states.CONNECTING[0];
	this.emit(states.CONNECTING[1]);
	_connect(uri, function attemptConnect(err, driver) {
		if(!err) {
			self.connection = {
				state: states.CONNECTED[0],
				driver: driver,
				uri: uri
			};
			self.emit(states.CONNECTED[1], uri);
			cb.call(self, undefined, uri);
		} else {
			self.connection = states.DISCONNECTED[0];
			self.emit(states.DISCONNECTED[1], err);
			cb.call(self, err);
		}
	});
};
/**
 * Disconnect from the port if a connection is currently established
 * @param {Function} cb
 */
SerialDriver.prototype.disconnect = function disconnect(cb) {
	if(this.connection.driver) this.connection.driver.close(cb.call(this));
	this.connection.state = states.DISCONNECTED[0];
	this.emit(states.DISCONNECTED[1]);
};
/**
 * List available ports found on the system
 * @param {Function} cb
 * @return {Array} array of objects describing type, driver, name, uri, and any extra information found during scan
 */
SerialDriver.prototype.list = function list(cb) {
	var self = this;

	serialPort.list(function createPortList(err, ports) {
  		if(!err) {
  			this.portList = 
  				ports.map(function mapPort(port) {
  					var extra = [];
  					if(port.pnpId != undefined) extra.push(['Plug&Play ID', port.pnpId]);
  					if(port.manufacture != undefined) extra.push(['Manufacturer', port.manufacture]);
  					return {
  						type: 'Serial Port',
  						driver: self,
  						name: port.comName,
  						extra: extra,
  						uri: 'serial://' + DEFAULT_BAUD + '@' + port.comName
  					};
  				});
  			cb.call(self, undefined, portList);
  		} else {
  			cb.call(self, err);
  		}
	});
};
/**
 * Probes for possible vehicles on ports, optionally connecting based upon heuristic
 * @param {Function} probeResultsCb callback to receive results of probe once timeouts have expired
 * @param {Function} alsoConnectCb if a callback is specified, connect to first found vehicle during port probing and callback
 */
SerialDriver.prototype.probe = function probe(probeResultsCb, alsoConnectCb) {
	var self = this;

	if(alsoConnectCb) {
		this.once('pong', function connectOnPong(port) {
			self.connect(port.uri, function autoConnectErrorCb(err) {
				alsoConnectCb.call(self, err, port);
			});
		});
	}

	var found = [];
	this.list(function probePortList(err, ports) {
		ports.forEach(function probePort(port) {
			// if we're already connected to this uri, don't probe it
			if(self.connection.state > 0 && self.connection.uri.port === port.uri) return;
			_connect(port.uri, function portProbeErrorCb(err, driver) {
				if(!err) {
					(function portConnectClosure(port) {
						driver.once('data', function(buff) {
							var data = buff.toString('utf8');
							if(data.match(PROBE_REGEXP)) {
								found.push(port);
								self.emit('pong', port);
							}
						});
						(function(port) {
							port.timeout = setTimeout(function portProbeTimeout() {
								driver.close();
								port.timeout = undefined;
								if(ports.every(function(triedPort) {
									return triedPort.timeout === undefined ? true : false;
								})) {
									if(probeResultsCb) probeResultsCb.call(self, found);
								}
							}, PROBE_RESPONSE_TIMEOUT);
						}(port));
						_send(PROBE_COMMAND, driver);
					}(port));			
				} else {
					// TODO: do something with this error...
					//console.log('error connecting on probe', port.name, err);
				}
			});
		});
	});
};
/**
 * Sends string data to the vehicle
 * @param {String} data String data to send
 * @param {Integer} lineCount number of response lines to expect (0 for no response expected)
 * @param {Function} cb called when all lines have been received
 */
SerialDriver.prototype.send = function send(data, lineCount, cb) {
	var self = this;
	if(this.connection.state === states.CONNECTED[0] || this.connection.state === states.READY[0]) {
		this.connection.state = states.TRANSMITTING[0];
		this.emit(states.TRANSMITTING[1], data);
		if(lineCount > 0) {
			var lines = [];
			var dataCb = function dataLineCb(line) {
				lines.push(line);
				if(lines.length === lineCount) {
					clearTimeout(lineTimeout);
					self.connection.driver.removeListener('data', dataCb);
					self.connection.state = states.READY[0];
					self.emit(states.READY[1]);
					cb.call(self, data, lines.join("\n"));
				}
			};
			this.connection.driver.on('data', dataCb);
			var lineTimeout = setTimeout(function lineTimeout() {
				// command did not return expected number of lines, return to ready, backoff & retry
				self.connection.driver.removeListener('data', dataCb);
				self.connection.state = states.READY[0];
				self.emit(states.READY[1]);
				// line timeout
				if((lines.length < lineCount) && cb) self.queue.push([data, lineCount, cb]); 
			}, LINE_TIMEOUT(lineCount));
		}
		_send(data, this.connection.driver, function sendErrorCb(err) {
			if(!err) {
				// if we don't have to wait for any data, move back to connected, otherwise
				// we need to wait for data and should not be transmitting
				if(lineCount > 0) {
					self.connection.state = states.RECEIVING[0];
					self.emit(states.RECEIVING[1]);
				} else if(cb) {
					self.connection.state = states.READY[0];
					self.emit(states.READY[1]);
					cb.call(self);
				} else {
					self.connection.state = states.READY[0];
					self.emit(states.READY[1]);
				}
			} else {
				// if there was some kind of error sending, push into send-queue for retry or failure
				if(cb) self.queue.push([data, lineCount, cb]);
			}
		});
	} else {
		this.queue.push([data, lineCount, cb]);
	}
};

/**
 * Gets the current state of the driver interface
 * @return {String} one of SerialDriver.states
 */
SerialDriver.prototype.getState = function getState() {
	return stateIntegerMapping[this.connection.state];
};

/**
 * Get raw streaming interface of underlying system driver
 * @return {Object} stream compatible instance of driver
 */
SerialDriver.prototype.getStream = function getStream() {
	return this.connection.driver;
};

/**
 * -
 *
 * @ignore
 */
function _connect(uri, cb) {
	var self = this,
		uri  = uri;
	
	var driver = new serialPort.SerialPort(uri.pathname, {
		baudrate: uri.auth,
		parser: serialPort.parsers.readline("\n"),
		buffersize: SERIAL_BUFFER_SIZE
	}, false, undefined);

	driver.on('open', function driverOpenCb() {
		cb.call(self, undefined, driver);
	});

	driver.on('error', function driverErrorCb() {
		// TODO: error handling
	});

	driver.open(function driverOpenErrorCb(err) {
		if(err) cb.call(driver, err);
	});
}

function _send(data, driver, cb) {
	var self = this;
	driver.write(data, function driverWriteErrorCb(err) {
		if(cb) {
			driver.drain(function driverDrainCb() {
				cb.call(self);
			});
		} else {
			driver.drain(function emptyDriverDrainDb() {});
		}
	});
}