#Nodequad  [![Build Status](https://travis-ci.org/jleppert/nodequad.svg?branch=master)](https://travis-ci.org/jleppert/nodequad) [![Dependency Status](https://gemnasium.com/jleppert/nodequad.svg)](https://gemnasium.com/jleppert/nodequad) [![Coverage Status](https://coveralls.io/repos/jleppert/nodequad/badge.png)](https://coveralls.io/r/jleppert/nodequad)

[![NPM](https://nodei.co/npm/nodequad.png?compact=true)](https://nodei.co/npm/nodequad/)
===============
**Node library to communicate with AeroQuad open source multirotor platform.**

*AeroQuad is a fully open source hardware and software platform for multirotor aircraft. More information can be found at <http://aeroquad.com>.*

___PLEASE NOTE: Under development. I plan to release at 0.0.9 milestone.___

Installing
---------------

	npm install nodequad

A command line interface is provided to send commands and receive telemetry data. To ensure `nodequad` is in your path, install it globally with npm:

	npm install -g nodequad


Getting Started
---------------
* The AeroQuad manual, forum and project: <http://aeroquad.com>
* Read a quick tutorial on how to use this library: <http://jleppert.github.io/nodequad/release/doc/tutorial>
* Look at generated library API Documentation at <http://jleppert.github.io/nodequad/release/doc/lib>
* Browse the examples under the examples directory of the project: <http://jleppert.github.io/nodequad/release/doc/examples>
* A command line reference is available at <http://jleppert.github.io/nodequad/release/doc/bin>

Quick Start
---------------

Make sure you have a working AeroQuad flight controller board and can connect to it via the USB connection or a wireless serial connection. For STM32 based flight controllers, you'll need to install the virtual com port driver under Windows, available here: <http://jleppert.github.io/nodequad/etc/VCP_V1.3.1_Setup.exe>.

Nodequad also uses new ES6 harmony features such as `Object.observe`, which requires node >= 0.11.13. You can obtain a compatible node version here: <http://blog.nodejs.org/2014/05/02/node-v0-11-13-unstable>.

Usage Example
----------------
``` js
var Nodequad = require('nodequad');
var vehicle = new Nodequad();

vehicle.probe.andConnect();

vehicle.on('driver.state.connected', function() {
	console.log('Connected to aircraft!');

	console.log('Reading aircraft flight configuration...');
	vehicle.sync('config.vehicle.*');

	console.log('Changing aircraft PID rate pid.');
	vehicle.config.pid.rate.roll = new AeroQuad.PID(1.0, 1.1, 1.2);

	console.log('Monitoring GPS sensor data...');
	vehicle.stream('state.gps');
});


// monitor changes in state
vehicle.on('state.**', function(key, data) {
	console.log('Aircraft state changed:', key, value);
});

// monitor when configuration values get changed
vehicle.on('config.**', function(key, data) {
	console.log('Aircraft configuration changed:', key, value);
});

// monitor communication events from the underlying driver, such as connection, disconnection, etc.
vehicle.on('driver.**', function() {
	console.log('Communication event occured:', this.event);
});
```

Running Tests
----------------

	npm test

To view/generate test coverage report <http://jleppert.github.io/nodequad/coverage/lcov-report>:

	npm run test-coverage

Contributing
----------------

* Setup a branch for what you are working on:

	`git checkout -b my-new-feature`

* Test your changes with existing tests

	`npm test`

* Add unit tests under `tests/`
* Add a description of your changes to the `CHANGELOG.md`. Link to any associated issue.
* Add an issue and tag it `pull request`, including a link to any associated issue. Please send pull requests from your branch so merging is easy.


Reporting Bugs & Feature Requests
----------------

Please use github to report all bugs and feature requests at <http://github.com/jleppert/nodequad/issues>.

License
----------------
Copyright (c) 2014 Johnathan Leppert <johnathan.leppert@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
