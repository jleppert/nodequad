var
	_	          = require('lodash'),
	events        = require('eventemitter2'),
	util   		  = require('util'),
	drivers  	  = require('./drivers')
	protocols     = require('./protocols'),
	defaultConfig = require('../config.json'),
	Vector		  = require('./vector');

var Aeroquad = module.exports = function Aeroquad(uri, opts, config) {
	events.EventEmitter2.call(this, { wildcard: true });

	opts = opts || {};

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

	this.comm.driver.on('*.*', passEvents('driver.'));
	this.comm.protocol.on('*.*', passEvents('protocol.'));

	this.comm.protocol.on('config.**', passEvents());
	this.comm.protocol.on('state.**', passEvents());

	this.probe.andConnect = probeAndConnect.call(this);
};
util.inherits(Aeroquad, events.EventEmitter2);

Aeroquad.prototype.getDriver = function getDriver() {
	return this.comm.driver;
};

Aeroquad.prototype.getProtocol = function getProtocol() {
	return this.comm.protocol;
};

Aeroquad.prototype.connect = function connect(uri, cb) {
	this.comm.driver.connect(uri, cb);
};

Aeroquad.prototype.probe = function probe(connectCb) {
	var self = this;
	this.comm.driver.probe(function afterProbeCb() {
		if(connectCb) connectCb.apply(self, arguments);
	});
};

Aeroquad.prototype.sync = function sync(path) {
	this.comm.protocol.sync(path);
};

Aeroquad.prototype.stream = function stream(path) {
	this.comm.protocol.stream(path);

	return {
		pause: function pause() {
			this.comm.protocol.pauseStream(path);
		}
	};
};

Aeroquad.Vector = function vector() {
	var instance = Object.create(Vector.prototype);
	Vector.apply(instance, Array.prototype.slice.call(arguments));
	return instance;
};

function probeAndConnect() {
	var self = this;

	return function callProbeAndConnect() {
		this.call(self, function(){});
	}
}