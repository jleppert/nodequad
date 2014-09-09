var objPath  = require('object-path'),
	Vector = require('../../vector');

function det(val) {
	return val.match(/Not Detected/g) ? false : true; 
}

function ena(val) {
	return val.match(/Not Enabled/g) ? false : true; 
}

function newLine(val) {
	var self   = this,
		result = [];

	//console.log('newline called!!');

	val.split("\r\n").forEach(function(sval, i) {
		if(Array.isArray(self.mapping[i])) {
			if(self.mapping[i][1].call) {
				var r = self.mapping[i][1].call(self, sval, sval, i);
				if(self.mapping[i][2] && self.mapping[i][2].call) {
					result.push(self.mapping[i][2].call(self, r));
				} else {
					result.push(r);
				}
			} else if(self.lineSplit) {
				sval.split(self.lineSplit[0]).forEach(function(ls, i) {
					var ls = ls.replace(/\r/g, '');
					if(self.lineSplit[i+1]) {
						result.push(self.lineSplit[i+1](ls));
					} else {
						result.push(ls);
					}
				});
			}
		} else {
			result.push(sval);
		}
	});

	return resultObj(this, result);
}

function resultObj(command, results) {
	var obj = {};

	results.forEach(function(result, i) {
		var mapping = command.mapping[i];
		if(mapping) {
			if(Array.isArray(mapping)) {
				if(mapping.some(function(e) {
					return (e.call ? true : false);
				})) {
					obj[mapping[0]] = result;
				} else {
					mapSingleLineResult(results, mapping, i);
				}
			} else {
				obj[mapping] = result;
			}
		}
	});

	function mapSingleLineResult(results, mapping) {
		results.forEach(function(r, i) {
			obj[mapping[i]] = r;
		});
	}

	return obj;
}

newLine.setter = function(input) {
	//input.
};

function comma(input) {
	var result = [];
	input.split(',').forEach(function(val, i) {
		if(Array.isArray(this.mapping[i])) {
			result.push(this.mapping[i][1].call(this, val, input, i));
		} else {
			result.push(val);
		}
	});

	return result;
}

comma.setter = function setter(path, value, root) {
	var result = [];

	this.mapping.forEach(function(map) {
		if(Array.isArray(map)) {
			var v = objPath.get(root, map[0]);
			result.push(map[1].deserialize(v).toJSON().join(';'));
		} else {
			result.push(objPath.get(root, map));
		}
	});

	return [this.commands.setter].concat(result.join(';').split('')).join('') + ';' + "\r\n";
}

function comma(val) {
	//console.log('comma called!!', val);
	//console.log(this.mapping);
	var csv = val.split(','),
		resultObj = {};
	this.mapping.forEach(function(map, i) {
		if(Array.isArray(map)) {
			var mut = map[1](csv);
			resultObj[map[0]] = mut[1];
			csv = mut[0];
		} else {
			resultObj[map] = csv.shift();
		}
	});
	//console.dir(resultObj);
/*

	val.split(',').forEach(function(val, i) {
		//console.log('mapping', this, val);
		if(Array.isArray(this.mapping[i])) {
			result.push(this.mapping[i][1].call(this, val, i));
		}
	});*/

	return resultObj;
}

function vector(csv) {
	//console.log('vector called', input, i);
	var v;
	if(csv.length >= 3) {
		v = new Vector(csv.shift(), csv.shift(), csv.shift());
	}
	return [csv, v];
}

vector.setter = function setter(input) {
	return [input.x, input.y, input.z].join(',');
}

vector.deserialize = function(val) {
	if(!(val instanceof Vector)) {
		return Vector.deserialize(val);
	} else {
		return val;
	}
}

function colon(input) {
	return input.split(':')[1].replace(/^\s+|\s+$/g, '');
}

function parseFloatDec(val) {
	return val ? parseFloat(val).toFixed(2) : 0.00;
}

var COMMANDS = module.exports = {
	SoftwareVersion: {
		commands: {
			getter: '!'
		},
		parser: newLine,
		mapping: [
			'config.vehicle.version'
		]
	},
	BoardConfiguration: {
		commands: {
			getter: '#'
		},
		parser: newLine,
		lines: 16,
		mapping: [
			undefined, 
			['config.vehicle.version', colon, parseFloat],
			['config.vehicle.type', colon],
			['config.vehicle.flight_config', colon],
			['config.vehicle.receiver_channels', colon, parseInt],
			['config.vehicle.motor_count', colon, parseInt],
			['config.vehicle.sensors.gyro', det],
			['config.vehicle.sensors.accelerometer', det], 
			['config.vehicle.sensors.barometer', det],
			['config.vehicle.sensors.magnetometer', det],
			['config.vehicle.enabled_features.heading_hold', ena],
			['config.vehicle.enabled_features.altitude_hold', ena],
			['config.vehicle.enabled_features.battery_monitor', ena],
			['config.vehicle.enabled_features.camera_stabilization', ena],
			['config.vehicle.enabled_features.range_detection', ena],
			['config.vehicle.enabled_features.gps', ena]
		]
	},
	RatePID: {
		commands: {
			getter: 'a',
			setter: 'A'
		},
		parser: comma,
		lines: 1,
		mapping: [
			['config.pid.rate.roll', vector],
			['config.pid.rate.pitch', vector],
			 'config.pid.rate.rotation_speed'
		]
	},
	AttitudePID: {
		commands: {
			getter: 'b',
			setter: 'B'
		},
		parser: comma,
		lines: 1,
		mapping: [
			['config.pid.attitude.roll_accel', vector],
			['config.pid.attitude.pitch_accel', vector],
			['config.pid.attitude.roll_gyro', vector],
			['config.pid.attitude.pitch_gyro', vector],
			 'config.pid.attitude.windup_guard'
		]
	},
	YawHeadingHoldPID: {
		commands: {
			getter: 'c',
			setter: 'C'
		},
		parser: comma,
		lines: 1,
		mapping: [
			['config.pid.heading_hold.yaw', vector],
			['config.pid.heading_hold.pid', vector],
			 'config.pid.heading_hold.config'
		]
	},
	AltitudeHoldPID: {
		commands: {
			getter: 'd',
			setter: 'D'
		},
		parser: comma,
		lines: 1,
		mapping: [
			['config.pid.altitude_hold.pid', vector],
			 'config.pid.altitude_hold.windup_guard',
			 'config.pid.altitude_hold.throttle_bump',
			 'config.pid.altitude_hold.throttle_panic',
			 'config.pid.altitude_hold.min_throttle_adjust',
			 'config.pid.altitude_hold.max_throttle_adjust',
			 'config.pid.altitude_hold.smooth_factor',
			['config.pid.altitude_hold.z_dampening', vector]

		]
	},
	MiscConfig: {
		commands: {
			getter: 'e',
			setter: 'E'
		},
		parser: newLine,
		lines: 1,
		lineSplit: [',', parseFloatDec, parseInt],
		mapping: [
			['config.vehicle.voltage_reference', 'config.vehicle.min_armed_throttle']
		]
	},
	TransmitterSmoothing: {
		commands: {
			getter: 'f',
			setter: 'F'
		},
		parser: comma,
		lines: 1,
		mapping: [
			'config.transmitter.smoothing.factor',
			'config.transmitter.smoothing.roll',
			'config.transmitter.smoothing.pitch',
			'config.transmitter.smoothing.yaw',
			'config.transmitter.smoothing.throttle',
			'config.transmitter.smoothing.mode',
			'config.transmitter.smoothing.aux1',
			'config.transmitter.smoothing.aux2',
			'config.transmitter.smoothing.aux3',
			'config.transmitter.smoothing.aux4',
			'config.transmitter.smoothing.aux5'
		]
	},
	TransmitterCalibration: {
		commands: {
			getter: 'g',
			setter: 'G'
		},
		parser: comma,
		mapping: []
	},
	TransmitterOffset: {
		commands: {
			getter: 'h',
			setter: 'H'
		},
		parser: comma,
		mapping: []
	},
	InitEEPROM: {
		commands: {
			method: 'I'
		},
		parser: comma
	},
	CalibrateGyro: {
		commands: {
			method: 'J'
		}
	},
	AccelCalibration: {
		commands: {
			getter: 'k',
			setter: 'K'
		},
		parser: comma,
		mapping: []
	},
	GenerateAccelBias: {
		commands: {
			method: 'L'
		}
	},
	MagnetometerCalibration: {
		commands: {
			getter: 'm',
			setter: 'M'
		},
		parser: comma,
		mapping: []
	},
	BatteryMonitor: {
		commands: {
			getter: 'n',
			setter: 'N'
		},
		parser: comma,
		mapping: [
			'config.battery_monitor.alarm_voltage',
			'config.battery_monitor.throttle_target'
		]
	},
	WayPoint: {
		commands: {
			getter: 'o',
			setter: 'O'
		},
		parser: comma,
		mapping: []
	},
	CameraStabilization: {
		commands: {
			getter: 'p',
			setter: 'P'
		},
		parser: comma,
		mapping: [
			 'config.camera.stabilization.mode',
			['config.camera.stabilization.center', vector],
			['config.camera.stabilization.scale_angle', vector],
			['config.camera.stabilization.servo.min', vector],
			['config.camera.stabilization.servo.max', vector]
		]
	},
	VehicleStateVariables: {
		commands: {
			getter: 'q'
		},
		parser: comma,
		mapping: []
	},
	RangeFinder: {
		commands: {
			getter: 'u',
			setter: 'U'
		},
		parser: comma,
		mapping: [
			'config.sensors.range_finder.max',
			'config.sensors.range_finder.min'
		]
	},
	GPSPID: {
		commands: {
			getter: 'v',
			setter: 'V'
		},
		lines: 1,
		parser: comma,
		mapping: [
			['config.pid.gps_hold.roll', vector],
			['config.pid.gps_hold.pitch', vector],
			['config.pid.gps_hold.yaw', vector]
		]
	},
	WriteEEPROM: {
		commands: {
			method: 'W'
		}
	},
	StopAllMessages: {
		commands: {
			method: 'X'
		}
	},

	Sensor: {
		stream: 'readable',
		commands: {
			stream: 'i'
		},
		parser: comma,
		mapping: [
			'state.vehicle.roll',
			'state.vehicle.pitch',
			'state.vehicle.yaw',
			'state.vehicle.throttle',
			'state.vehicle.mode',
			'state.vehicle.aux1',
			'state.vehicle.aux2',
			'state.vehicle.aux3',
			'state.vehicle.aux4'
		]
	},

	Magnetometer: {
		stream: 'readable',
		commands: {
			stream: 'y'
		},
		parser: comma,
		mapping: [
			'state.mag.x',
			'state.mag.y',
			'state.mag.z'
		]
	},

	GPSStatus: {
		stream: 'readable',
		commands: {
			stream: 'y'
		},
		parser: comma,
		mapping: [
			'state.gps.state',
			'state.gps.lat',
			'state.gps.lon',
			'state.gps.height',
			'state.gps.course',
			'state.gps.speed',
			'state.gps.accuracy',
			'state.gps.sats',
			'state.gps.fixtime',
			'state.gps.sentences',
			'state.gps.idlecount'
		]
	},
	Altitude: {
		stream: 'readable',
		commands: {
			stream: 'z'
		},
		parser: comma,
		mapping: [
			'state.altitude0',
			'state.altitude1',
		]
	},
	VoltageCurrent: {
		stream: 'readable',
		commands: {
			stream: 'y'
		},
		parser: comma,
		mapping: [
			'state.battery.voltage',
			'state.battery.current',
			'state.battery.used_capacity'
		]
	},
	RSSI: {
		stream: 'readable',
		commands: {
			stream: '%'
		},
		parser: comma,
		mapping: [
			'state.rssi'
		]		
	},
	CalibrateESCHigh: {
		commands: {
			method: '1'
		}
	},
	CalibrateESCLow: {
		commands: {
			method: '2'
		}
	},
	ESCCalibrationOn: {
		commands: {
			method: '3'
		}
	},
	ESCCalibrationOff: {
		commands: {
			method: '4'
		}
	},
	Motors: {
		commands: {
			getter: '6',
			setter: '5'
		},
		parser: comma,
		mapping: [
			'state.motor'
		]
	}
};