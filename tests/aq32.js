var AQ32Protocol = require('../lib/protocols').AQ32,
	AeroQuad     = require('../index');


//'serial://115200@/dev/ttyUSB1'
var aq = new AeroQuad();

aq.probe.andConnect();

aq.on('driver.state.connected', function onDriverStateConnected() {
	//aq.config.pid.rate.pitch = AeroQuad.Vector(3.54, 9.00, 10.00);
	var something  = AeroQuad.Vector(3.54, 9.00, 10.00);
	//console.log(aq.config.pid.rate.roll);

	console.log('Connected!!!!');

	aq.stream('state.gps');

	//aq.sync('config.pid.rate.roll');

	//aq.WriteEEPROM();
});

aq.on('config.**', function onConfigValueChange(key, data) {
	//console.log(this.event);
	//console.log('event');
     console.log(key, data);
	//console.dir(aq.config.vehicle);
});


aq.on('state.**', function onConfigValueChange(key, data) {
	//console.log(this.event);
	//console.log('event');
     console.log('state change!!!', key, data);
	//console.dir(aq.config.vehicle);
});

aq.on('driver.**', function onDriverEvent(key, data) {
	console.log(this.event);
});


//aq.config.vehicle.motor_count = 8;

//AeroQuad.on('driver.state.**', function() {
//	console.log('state change: ' + this.event);
//});




//console.dir(AQ32Protocol);


/*
TODO
 - streams and methods

aq.stream('state.gps')          - starts streaming of data, monitor from serial and start changing state paths, triggering emit of events
aq.stream('state.gps').pause(); - pauses streaming of data from gps
aq.stream('')



- look into DNODE protocol, better communication scheme




*/


