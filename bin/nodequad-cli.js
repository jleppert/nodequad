var PACKAGE  = require('../package.json'),
	path     = require('path'),
    objPath  = require('object-path'),
	global   = this,
	Nodequad = require('../index');

var argv = require('yargs')
    .options('d', {
        alias : 'driver',
        default : 'serial',
        string: true,
        requiresArg: true,
        describe: "The name of the driver from Aeroquad.drivers or a path to a file that implements a driver interface. Defaults to 'serial' driver."
    })
    .options('p', {
        alias : 'protocol',
        default : 'AQ32',
        string: true,
        requiresArg: true,
        describe: "The name of the protocol from Aeroquad.protocols or a path to a file that implements a protocol interface. Defaults to 'AQ32' driver."
    })
	.options('l', {
        alias : 'list',
        boolean: true,
        describe: "Returns json array of available ports given a communications driver."
    })
    .options('r', {
        alias : 'probe',
        boolean: true,
        describe: "Returns json array of available vehicles on all ports based on a heuristic."
    })
    .options('c', {
        alias : 'connect',
        string: true,
        describe: "Attempts connection to a given URI, or uses the first vehicle URI from a successful probe when used in combination with the `--probe` option."
    })
    .options('o', {
        alias : 'on',
        string: true,
        requiresArg: true,
        describe: "Subscribe to an event and receive notifications, JSON output, newline delimited."
    })
    .options('s', {
        alias : 'sync',
        string: true,
        describe: "Read or write key data. If a value is not specified, it is read from the vehicle. To set a value provide the value in JSON."
    })
    .options('t', {
        alias : 'stream',
        string: true,
        requiresArg: true,
        describe: "Streams real-time state data from the vehicle for a given key."
    })
    .options('f', {
        alias : 'file',
        config: true,
        string: true,
        requiresArg: true,
        describe: "Use a JSON file as options instead of putting them on the command line"
    })
    .check(function(parsed, opts) {
    	//if(parsed.subscribe) {
    	//	return false;
    	//}
    }).
    example('$0 --list', "List JSON array of available ports").
    example('$0 --probe --connect', "Probe and automatically connect to first found vehicle").
    example('$0 --connect serial://115200@/dev/ttyACM0 --sync config.vehicle.*', "Connect to serial on /dev/ttyACM0 with baud 115200, and read all config.vehicle flight parameters").
    example('$0 --probe --connect --sync config.vehicle.pid.roll [1.1, 1.2, 1.3]', "Probe, connect and set vehicle roll pid").
    example('$0 --probe --connect --on driver.state.connected', "Probe, connect and monitor driver.state.connected events").
    example('$0 --probe --connect --stream state.gps.*', "Probe, connect and stream GPS state events")
    .version(PACKAGE.version)
    .showHelpOnFail(false, "Specify --help for available options or view the man page for nodequad")
    .argv;

/*
var nq  = new Nodequad(),
    uri = argv.connect && argv.connect.length ? argv.connect : undefined,
    events = {};

['driver', 'protocol'].forEach(function(item) {
	if(Nodequad[item + 's'][argv[item]] != undefined) {
        createCustom(item, Nodequad[item + 's'][argv[item]]);
        return;
    }
	
	if(argv[item].length) {
		try {
			var custom = require(path.resolve(process.cwd(), argv[item]));
			if(custom != undefined) {
                createCustom(item, custom);
            }
		} catch(e) {
			console.log(['Failed to require custom', item, ':', e.message].join(' '));
		}
	}

    function createCustom(key, obj) {
        if(obj === undefined) return;
        if(key === 'driver') {
            global[key] = new obj(uri);
        } else if(key === 'protocol') {
            global[key] = new obj(nq, { config: nq.config, state: nq.state, methods: nq.methods });
        }
    }

});

// handle listing communication ports
if(argv.list) {
    nq.getDriver().list(function (ports) {
        out(ports);
        process.exit(0);
    });
    return;
}

// handle probe and connecting
if(argv.probe && argv.connect) {
    nq.probe.andConnect();
} else if(argv.probe && uri === undefined) {
    nq.probe(function (ports) {
        out(ports);
        process.exit(0);
    });
    return;
}

// handle subscribed events
if(argv.on) {
    if(!Array.isArray(argv.on)) argv.on = [argv.on];
    argv.on.forEach(function(key) {
        monitorEvent(key);
    });
}
*/
// handle (one or more) sync'd properties
if(argv.sync) {
    if(!Array.isArray(argv.sync)) argv.sync = [argv.sync];
    argv.sync.forEach(function(key, i) {
        if(argv._[i]) {
            // setting a value
            objPath.set(nq, key, JSON.parse(argv._[i]));
        } else {
            // retreieving a value
            monitorEvent(key);
            nq.sync(key);
        }
    });
}

// handle (one or more) streams
if(argv.stream) {
    if(!Array.isArray(argv.stream)) argv.stream = [argv.stream];
    argv.stream.forEach(function(key) {
        // streaming data
        monitorEvent(key);
        nq.stream(key);
    });
}

function out(json) {
    console.log(JSON.stringify(json));
};

function monitorEvent(key) {
    if(events[key]) return;
    nq.on(key, function() {
        out({
            on: key,
            event: this.event,
            arguments: arguments
        });
    });
    events[key] = true;
}

/*
var protocol = undefined;
if(nq.drivers[argv.driver] != undefined) {
	driver = nq.drivers[argv.driver];
} else {
	try {
		var customDriver = require(path.resolve(process.cwd(), argv.driver));
		if(customDriver) driver = customDriver; 
	} catch(e) {
		console.log('Failed to require custom driver', e.message);
	}
}
*/
//var nq = new nq(argv.connect && argv.connect.length ? argv.connect : undefined, {
//	driver: new nq.drivers[argv.driver]
//})