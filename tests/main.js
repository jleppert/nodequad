var assert = require('chai').assert,
	mocha  = require('mocha');

var SerialDriver = require('../lib/drivers/serial.js'),
	EventEmitter = require('eventemitter2').EventEmitter2;

describe('lib/drivers/serial.js', function() {
	describe('object', function() {
		it('should implement eventemitter', function() {
			assert.equal(SerialDriver.super_, EventEmitter);
		});

		it('should expose states', function() {
			assert.deepProperty(SerialDriver, 'states.DISCONNECTED');
			assert.deepProperty(SerialDriver, 'states.CONNECTING');
			assert.deepProperty(SerialDriver, 'states.CONNECTED');
			assert.deepProperty(SerialDriver, 'states.READY');
			assert.deepProperty(SerialDriver, 'states.TRANSMITTING');
			assert.deepProperty(SerialDriver, 'states.RECEIVING');
			assert.deepProperty(SerialDriver, 'states.BACKOFF');
		});

	});

	describe('constructor', function() {
		var driver = new SerialDriver();

		describe('without a uri', function() {
			it('should construct a SerialDriver', function() {
				assert.ok(driver instanceof SerialDriver);
			});

			it('should start in a disconnected state without a driver and empty uri ', function() {
				assert.equal(driver.connection.state, SerialDriver.states.DISCONNECTED);
				assert.isUndefined(driver.connection.driver);
				assert.deepEqual(driver.connection.uri, {});
			});

			it('should start with an empty queue, backoffs, and discovered ports', function() {
				assert.deepEqual(driver.queue, []);
				assert.deepEqual(driver.backOffs, []);
				assert.deepEqual(driver.foundPorts, []);
			});

			it('should have a backoff listener', function() {
				assert.isFunction(driver.backOff.handlers.backoff);
			});
		});

		describe('with a uri', function() {
			it('should accept a uri that is available', function() {
				var uri = 'serial://115200@/someport';
				var oldList = SerialDriver.prototype.list;
				SerialDriver.prototype.list = function(cb) {
					this.portList = [{
						type: 'Serial Port',
						driver: undefined,
						name: '/someport',
						extra: {},
						uri: uri
					}];
					cb(undefined, this.portList);
				};
				var driver = new SerialDriver(uri);
				var url = require('url'); 
				assert.deepEqual(driver.connection.uri, url.parse(uri));
				SerialDriver.prototype.list = oldList;
			});
		});
	});

	describe('.connect', function() { 

	});

	describe('.disconnect', function() { 

	});

	describe('.list', function() { 

	});

	describe('.probe', function() { 

	});

	describe('.send', function() { 

	});

	describe('.getStream', function() { 

	});
});