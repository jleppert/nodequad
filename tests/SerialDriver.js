var assert = require('chai').assert,
	mocha  = require('mocha'),
	sinon  = require('sinon'),
	rewire = require('rewire');

var SerialDriver = require('../lib/drivers/serial.js'),
	EventEmitter = require('eventemitter2').EventEmitter2;

/**
 * This controls whether to use a mock with this test or not. Using a mock is faster, but just tests that the code works
 * according to a certain implementation of the mock. Tests run with a mock will need a fully 
 * @type {Object} constants
 */
const MOCK = process.env.NOMOCK ? false : true,
	  URI  = process.env.URI    || 'serial://115200@/someport';

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
		var driver = new SerialDriver(),
		    __sd   = rewire('../lib/drivers/serial.js'),
		    __states = __sd.__get__('states');


		var withoutURITests = function() {
			it('should construct a SerialDriver', function() {
				assert.ok(driver instanceof SerialDriver);
			});

			it('should start in a disconnected state without a driver and empty uri ', function() {
				assert.equal(driver.getState(), SerialDriver.states.DISCONNECTED);
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
		};

		describe('without a uri', withoutURITests);

		describe('with a uri', function() {
			it('should accept a uri that is available', function() {
				var	oldList = SerialDriver.prototype.list;

				if(MOCK) SerialDriver.prototype = mockList(SerialDriver.prototype);

				var driver = new SerialDriver(URI);
				var url = require('url'); 
				assert.deepEqual(driver.connection.uri, url.parse(URI));

				if(MOCK) SerialDriver.prototype.list = oldList;
			});

			withoutURITests();
		});
	});

	function mockList(driverPrototype) {
		driverPrototype.list = function(cb) {
			this.portList = [{
				type: 'Serial Port',
				driver: undefined,
				name: '/someport',
				extra: {},
				uri: URI
			}];
			cb(undefined, this.portList);
		};
		return driverPrototype;
	}

	var serialPort  = require('serialport');

	function serialPortMock(openError) {
		return {
			SerialPort: function(path, options, openImmediately, callback) {
				return {
					openCb: undefined,
					errorCb: undefined,
					on: function(event, cb) {
						if(event === 'open') {
							this.openCb = cb;
						}
						if(event === 'error') undefined;
					},
					open: function(cb) {
						if(openError) {
							if(this.errorCb) this.errorCb.call(this);
							cb.call(this, true);
						} else {
							if(this.openCb) this.openCb.call(this);
							cb.call(undefined);
						}
					}
				}
			},
			// don't mock this
			parsers: serialPort.parsers
		};
	}

	describe('.connect', function() {
		var url    = require('url'),
			Driver = undefined;

		if(MOCK) {
			var __SerialDriver = rewire('../lib/drivers/serial.js');
			__SerialDriver.prototype = mockList(__SerialDriver.prototype);
			__SerialDriver.__set__('serialPort', serialPortMock(false));
			// use mocked version
			Driver 	= __SerialDriver;
		} else {
			// otherwise, don't mock
			Driver  = SerialDriver;
		}

		function stateBehavoirs() {
			it('transitions state: connecting -> connected on successful connection', function() {
				var driver = new Driver(URI),
					connectingSpy = sinon.spy(),
					connectedSpy  = sinon.spy();

				driver.on(Driver.states.CONNECTING, connectingSpy);
				driver.on(Driver.states.CONNECTED, connectedSpy);

				driver.connect(undefined, cb);
				assert.ok(connectingSpy.calledOnce);
				assert.ok(connectedSpy.calledOnce);
				assert.ok(connectingSpy.calledBefore(connectedSpy));
				assert.ok(connectedSpy.calledAfter(connectingSpy));
			});

			if(MOCK) {
				// for now, only tested using a mock, better to provide bogus URI in the future
				it('transitions state: connecting -> disconnected on unsuccessful connection', function() {
					var oldMock = Driver.__get__('serialPort');
					Driver.__set__('serialPort', serialPortMock(true));
					var driver = new Driver(URI),
						connectingSpy   = sinon.spy(),
						connectedSpy    = sinon.spy(),
						disconnectedSpy = sinon.spy();

					driver.on(Driver.states.CONNECTING, connectingSpy);
					driver.on(Driver.states.CONNECTED, connectedSpy);
					driver.on(Driver.states.DISCONNECTED, disconnectedSpy);

					driver.connect(undefined, cb);
					assert.ok(connectingSpy.calledOnce);
					assert.ok(disconnectedSpy.calledOnce);
					assert.ok(!connectedSpy.called);
					assert.ok(connectingSpy.calledBefore(disconnectedSpy));
					assert.ok(disconnectedSpy.calledAfter(connectingSpy));
					Driver.__set__('serialPort', oldMock);
				});
			}
		}

		describe('without a uri', function() {
			it('uses the uri attached to the instance', function() {
				var driver = new Driver(URI);
					cb 	   = sinon.spy();

				driver.connect(undefined, cb);
				assert.ok(cb.calledOnce);
				assert.ok(cb.neverCalledWith('No URI available'));
				assert.ok(cb.calledWith(undefined, url.parse(URI)));
				assert.ok(cb.calledOn(driver));
				assert.deepEqual(driver.connection.uri, url.parse(URI));
			});

			stateBehavoirs();
		});

		describe('with a uri', function() {
			it('uses the provided uri', function() {
				var driver = new Driver(undefined);
				    cb     = sinon.spy();

				driver.connect(URI, cb);
				assert.ok(cb.calledOnce);
				assert.ok(cb.neverCalledWith('No URI available'));
				assert.ok(cb.calledWith(undefined, url.parse(URI)));
				assert.ok(cb.calledOn(driver));
				assert.deepEqual(driver.connection.uri, url.parse(URI));
			});

			stateBehavoirs();
		});
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