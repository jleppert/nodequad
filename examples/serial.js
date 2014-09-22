/*
var SerialDriver = require('../lib/drivers/serial.js');

var driver = new SerialDriver();

driver.list(function(err, portList) {
	console.dir(portList);
});

driver.on('connecting', function() {
	console.log('connecting!!');
});



driver.connect('serial://115200@/dev/ttyACM0', function(err, uri) {
	console.log('Connected to uri:', uri);
});

driver.on('connected', function() {
	console.log('connected');
});

driver.send('#', 16, function(d1, d2) {
		console.log(d2);
	});

driver.probe(function(err, port) {
	console.log('connected to port!', err, port);
});

driver.on('connecting', function() {
	console.log('connecting...');
});

driver.on('transmitting', function() {
	console.log('transmitting...');
});

driver.on('receiving', function() {
	console.log('receiving...');
});



driver.on('connected', function() {
	console.log('connected');
	
});

TODO:
	- serial driver error handling in most cases
	- unit tests for serial driver (look into mocks for driver)
	- hook up protocol driver
	- get send and receive commands working
	- review public/private namespaces
	- README, package.json, etc.

*/
var serialPort  = require('serialport');

	var driver = new serialPort.SerialPort('/dev/ttyACM0', {
		baudrate: 115200,
		parser: serialPort.parsers.readline("\n"),
		buffersize: 256
	}, false);

	driver.open();

	driver.on('open', function() {
		driver.write('!', function(err, results) {
			console.log(err, results);
		});
	});