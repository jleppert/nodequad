#!/usr/bin/env node
var PACKAGE  = require('../package.json'),
    path     = require('path'),
    objPath  = require('object-path'),
    global   = this,
    Nodequad = require('../index');

var argv = require('yargs')
    .options('driver', {
        alias : 'd',
        default : 'serial',
        string: true,
        requiresArg: true,
        describe: "The name of the driver from Aeroquad.drivers or a path to a file that implements a driver interface. Defaults to 'serial' driver."
    })
    .options('protocol', {
        alias : 'p',
        default : 'AQ32',
        string: true,
        requiresArg: true,
        describe: "The name of the protocol from Aeroquad.protocols or a path to a file that implements a protocol interface. Defaults to 'AQ32' driver."
    })
    .options('list', {
        alias : 'l',
        boolean: true,
        describe: "Returns json array of available ports given a communications driver."
    })
    .options('probe', {
        alias : 'r',
        boolean: true,
        describe: "Returns json array of available vehicles on all ports based on a heuristic."
    })
    .options('connect', {
        alias : 'c',
        string: true,
        describe: "Attempts connection to a given URI, or uses the first vehicle URI from a successful probe when used in combination with the `--probe` option."
    })
    .options('on', {
        alias : 'o',
        string: true,
        requiresArg: true,
        describe: "Subscribe to an event and receive notifications, JSON output, newline delimited."
    })
    .options('sync', {
        alias : 's',
        string: true,
        describe: "Read or write key data. If a value is not specified, it is read from the vehicle. To set a value provide the value in JSON."
    })
    .options('stream', {
        alias : 't',
        string: true,
        requiresArg: true,
        describe: "Streams real-time state data from the vehicle for a given key."
    })
    .options('file', {
        alias : 'f',
        config: true,
        string: true,
        requiresArg: true,
        describe: "Use a JSON file as options instead of putting them on the command line"
    })
    .options('pretty', {
        alias : 'e',
        boolean: true,
        describe: "Pretty-print JSON output"
    })
    .check(function(parsed, opts) {
        //if(parsed.subscribe) {
        //  return false;
        //}
    }).
    example('$0 --list', "List JSON array of available ports").
    example('$0 --probe --connect', "Probe and automatically connect to first found vehicle").
    example('$0 --connect serial://115200@/dev/ttyACM0 --sync config.vehicle.*', "Connect to serial on /dev/ttyACM0 with baud 115200, and read all config.vehicle flight parameters").
    example('$0 --probe --connect --sync config.vehicle.pid.roll [1.1, 1.2, 1.3]', "Probe, connect and set vehicle roll pid").
    example('$0 --probe --connect --on driver.state.connected', "Probe, connect and monitor driver.state.connected events").
    example('$0 --probe --connect --stream state.gps.*', "Probe, connect and stream GPS state events")
    .version(PACKAGE.version, 'version')
    .options('v', {
        describe: "Show version number"
    })
    .help('help')
    .wrap(90)
    .showHelpOnFail(true, "View the man page for nodequad for more information and examples.")
    .argv;

// handle piped-in JSON
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(data) {
    var options = undefined;

    try {
        options = JSON.parse(data);
    } catch(error) {
        out(['error', error]);
        process.exit(0);
    }

    try {
    	if(options != undefined) handleOptions(options);
    	process.exit(1);
    } catch(error) {
    	out(['error', error]);
    	process.exit(0);
    }
});

var nq  = new Nodequad(),
    uri = argv.connect && argv.connect.length ? argv.connect : undefined,
    events = {};

// handle command line options
try {
	handleOptions(argv);
	//process.exit(1);
} catch(error) {
	out(['error', error]);
    //process.exit(0);
}

function handleOptions(options) {
    ['driver', 'protocol'].forEach(function(item) {
        if(Nodequad[item + 's'][options[item]] != undefined) {
            createCustom(item, Nodequad[item + 's'][options[item]]);
            return;
        }
        
        if(options[item].length) {
            try {
                var custom = require(path.resolve(process.cwd(), options[item]));
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

    // pretty-print JSON
    if(options.pretty) {
        out = function(obj) {
            console.log(JSON.stringify(obj, null, 4));
        }
    }

    // handle listing communication ports
    if(options.list) {
        nq.getDriver().list(function (err, ports) {
            out(ports.map(function filter(port) {
                return {
                    type: port.type,
                    name: port.name,
                    extra: port.extra,
                    uri: port.uri
                };
            }));
            process.exit(0);
        });
        return;
    }

    //process.exit(0);

    // handle probe and connecting
    if(options.probe && options.connect) {
        nq.probe.andConnect();
    } else if(options.probe && uri === undefined) {
        nq.probe(function (ports) {
            out(ports.map(function filter(port) {
                return {
                    type: port.type,
                    name: port.name,
                    extra: port.extra,
                    uri: port.uri
                };
            }));
            process.exit(0);
        });
        return;
    }

    // handle subscribed events
    if(options.on) {
        if(!Array.isArray(options.on)) options.on = [options.on];
        options.on.forEach(function(key) {
            monitorEvent(key);
        });
    }

    // handle (one or more) sync'd properties
    if(options.sync) {
        if(!Array.isArray(options.sync)) options.sync = [options.sync];
        options.sync.forEach(function(key, i) {
            if(options._[i]) {
                // setting a value
                objPath.set(nq, key, JSON.parse(options._[i]));
            } else {
                // retreieving a value
                monitorEvent(key);
                nq.sync(key);
            }
        });
    }

    // handle (one or more) streams
    if(options.stream) {
        if(!Array.isArray(options.stream)) options.stream = [options.stream];
        options.stream.forEach(function(key) {
            // streaming data
            monitorEvent(key);
            nq.stream(key);
        });
    }
}

function out(obj) {
    console.log(JSON.stringify(obj));
}

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