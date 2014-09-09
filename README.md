Nodequad  [![Build Status](https://secure.travis-ci.org/jleppert/nodequad.png)](http://travis-ci.org/jleppert/nodequad)
===============
Node library to communicate with nodequad open source multicopter platform

Installing
---------------

	npm install nodequad

A command line interface is provided to control and receive telemetry data. To ensure `nodequad` is in your path, instally globally with npm:

	npm install -g nodequad


Getting Started
---------------
	The AeroQuad manual, forum and project: <http://aeroquad.com>

	Read a quick tutorial on how to use this library: <http://github.io/jleppert/nodequad/tutorial>

	Generated library API Documentation is available at <http://github.io/jleppert/nodequad/docs>

	Browse the examples under the examples directory of the project: <http://github.io/jleppert/nodequad/docs/examples>

	Command line reference is available at <http://github.io/jleppert/nodequad/docs/bin/nodequad-cli>


Quick Start
---------------

Make sure you have a working AeroQuad flight controller board and can connect to it via the USB connection or a wireless serial connection. For STM32 based flight controllers, you'll need to install the virtual com port driver under windows <http://github.io/jleppert/nodequad/dist/VCP_V1.3.1_Setup.exe>.

Aeroquad also uses new harmony features such as `Object.observe`, which requires node >= 0.11.13, which you can download (source) here: <http://blog.nodejs.org/2014/05/02/node-v0-11-13-unstable>.

Usage Example
----------------

	var AeroQuad = require('nodequad');
	var quad = new AeroQuad();

	quad.probe.andConnect();

	quad.on('driver.state.connected', function() {
		console.log('Connected to aircraft!');

		console.log('Reading aircraft flight configuration...');
		aq.sync('config.vehicle.*');

		console.log('Changing aircraft PID rate pid.');
		quad.config.pid.rate.roll = new AeroQuad.PID(1.0, 1.1, 1.2);

		console.log('Monitoring GPS sensor data...');
		quad.stream('state.gps');
	});


	// monitor changes in state
	quad.on('state.**', function(key, data) {
		console.log('Aircraft state changed:', key, value);
	});

	// monitor when configuration values get changed
	quad.on('config.**', function(key, data) {
		console.log('Aircraft configuration changed:', key, value);
	});

	// monitor communication events from the underlying driver, such as connection, disconnection, etc.
	quad.on('driver.**', function() {
		console.log('Communication event occured:', this.event);
	});

Running Tests
----------------

	npm test


To view/generate test coverage report <http://github.io/jleppert/nodequad/test/coverage>:

	npm test-coverage


Contributing
----------------

* Setup a branch for what you are working on:

	git checkout -b my-new-feature

* Test your changes

	npm test

* Add unit tests under `tests/`
* Add a description of your changes to the `CHANGELOG.md`. Link to any associated issue.
* Add an issue and tag it `pull request`, including a link to any associated issue. Please send pull requests from your branch so merging is easy.


Reporting Bugs & Feature Requests
----------------

Please use github to report all bugs and feature requests at <http://github.com/jleppert/nodequad/issues>.