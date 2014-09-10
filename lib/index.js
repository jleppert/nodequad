var
	_	          = require('lodash'),
	events        = require('eventemitter2'),
	util   		  = require('util'),
	drivers  	  = require('./drivers')
	protocols     = require('./protocols'),
	defaultConfig = require('../config.json'),
	Vector		  = require('./vector');

/**
 * The Nodequad object representing the state and control of a single vehicle. The returned instance is a subclass of event emitter and allows wildcard events.
 * @constructor
 * @param {string} uri           An URI to connect to (optional)
 * @param {object} opts.driver   The driver instance to use (one of Aeroquad.drivers; see lib/drivers)
 * @param {object} opts.protocol The protocol instance to use (one of Aeroquad.protocols; see lib/protocols)
 * @param {object} config 		 An optional flight configuration object, if not specified the configuration under etc/config.json will be used
 */
var Aeroquad = module.exports = function Aeroquad(uri, opts, config) {
	events.EventEmitter2.call(this, { wildcard: true });

	opts = opts || {};

/**
 * State object of available stateful properties which can be subscribed to for streaming of data 
 * @type {Object} observeable object
 */
	this.state = {
		vehicle: {
			roll:  		undefined,
			pitch: 		undefined,
			yaw:   		undefined,
			throttle:   undefined,
			mode:       undefined,
			aux1:       undefined,
			aux2:       undefined,
			aux3:       undefined,
			aux4:       undefined
		},

		mag: {
			x: undefined,
			y: undefined,
			z: undefined
		},

		gps: {
			state: 	   undefined,
			lat: 	   undefined,
			lon: 	   undefined,
			height:    undefined,
			course:    undefined,
			speed:     undefined,
			accuracy:  undefined,
			sats:      undefined,
			fixtime:   undefined,
			sentences: undefined,
			idlecount: undefined
		},

		battery: {
			voltage: 		undefined,
			current: 		undefined,
			used_capacity: 	undefined
		},

		rssi: undefined
	};
/**
 * methods
 *
 * @ignore
 */
	this.methods = { };

	this.config = config || defaultConfig;

	this.comm = _.defaults(opts, {
		driver: new drivers.serial(uri ? uri : undefined),
		protocol: new protocols.AQ32(this, { config: this.config, state: this.state, methods: this.methods })
	});

	_.assign(this, this.methods);

	var self = this;
	var passEvents = function passEvents(prefix) {
		var prefix = prefix ? prefix : '';
		return function applyPassedEvent() {
			self.emit.apply(self, [].concat(prefix + this.event).concat(Array.prototype.slice.call(arguments)));
		}
	};

/**
 * Events from the protocol and driver are propogated so they are observeable on the nodequad object.
 */
	this.comm.driver.on('*.*', passEvents('driver.'));
	this.comm.protocol.on('*.*', passEvents('protocol.'));

	this.comm.protocol.on('config.**', passEvents());
	this.comm.protocol.on('state.**', passEvents());
/**
 * -
 *
 * @ignore
 */
	this.probe.andConnect = probeAndConnect.call(this);
};
util.inherits(Aeroquad, events.EventEmitter2);

/**
 * Returns the current working driver
 * @return     {Object} The driver instance in use (one of Aeroquad.drivers; see lib/drivers)
 */
Aeroquad.prototype.getDriver = function getDriver() {
	return this.comm.driver;
};
/**
 * Returns the current working protocol
 * @return     {Object} The protocol instance in use (one of Aeroquad.protocols; see lib/protocols)
 */
Aeroquad.prototype.getProtocol = function getProtocol() {
	return this.comm.protocol;
};
/**
 * Connect to the vehicle
 * @param {String}   uri uri to connect (optional; driver defaulted)
 * @param {Function} cb
 */
Aeroquad.prototype.connect = function connect(uri, cb) {
	this.comm.driver.connect(uri, cb);
};
/**
 * Probe attached ports for an available vehicle, may also chain .andConnect() to connect to first found vehicle
 * @param {Function} connectCb receive a list of ports
 */
Aeroquad.prototype.probe = function probe(connectCb) {
	var self = this;
	this.comm.driver.probe(function afterProbeCb() {
		if(connectCb) connectCb.apply(self, arguments);
	});
};
/**
 * Sync a config or state path from vehicle (preferring vehicle data as source of truth)
 * @param {String} path of config or state to sync, wildcards supported
 */
Aeroquad.prototype.sync = function sync(path) {
	this.comm.protocol.sync(path);
};
/**
 * Begin or end streaming of data from vehicle
 * @param {String} path of config or state to stream, wildcards supported
 * @return {Object} returns an object with method pause() to pause the streaming of the path
 */
Aeroquad.prototype.stream = function stream(path) {
	this.comm.protocol.stream(path);

	return {
		pause: function pause() {
			this.comm.protocol.pauseStream(path);
		}
	};
};
/**
 * Creates and returns an instance of Aeroquad.Vector
 * @param {Integer} x
 * @param {Integer} y
 * @param {Integer} z
 */
Aeroquad.Vector = function vector() {
	var instance = Object.create(Vector.prototype);
	Vector.apply(instance, Array.prototype.slice.call(arguments));
	return instance;
};

/**
 * Available protocols to use
 * @type {Object} (see protocols/index.js for complete listing)
 */
Aeroquad.protocols = protocols;
/**
 * Available communication drivers to use
 * @type {Object} (see drivers/index.js for complete listing)
 */
Aeroquad.drivers   = drivers;

/**
 * Probe and connect to vehicle
 * @private
 */
function probeAndConnect() {
	var self = this;

	return function callProbeAndConnect() {
		this.call(self, function(){});
	}
}