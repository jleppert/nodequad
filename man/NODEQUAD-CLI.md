nodequad(1) -- Communicate with an aeroquad vehicle from the command line
===================================

## SYNOPSIS

	nodequad <command..> [args..]

	nodequad --list
	nodequad --probe --connect
	nodequad --connect serial://115200@/dev/ttyACM0 --sync config.vehicle.*
	nodequad --probe --connect --sync config.vehicle.pid.roll [1.1, 1.2, 1.3]
	nodequad --probe --connect --subscribe driver.state.connected
	nodequad --probe --connect --stream state.gps.*

## VERSION

0.0.1

## DESCRIPTION

nodequad is a command line utility to communicate with an Aeroquad vehicle. It
supports most features of the API client. This program is useful for basic interfacing
via shell scripts or exec'ing from external applications that cannot use the API client.

## INTRODUCTION

`nodequad --connect serial://115200@/dev/ttyACM0` will connect to the
aeroquad at /dev/ttyACM0 at baudrate 115200 and terminate with a 0 exit code if successful, or non-zero if
not successfull after a default timeout. Note this URI will use the 'serial' driver.

You can also list available interfaces for a given driver, using the --list command. The following example outputs a
JSON array for possible communication ports and exits: `nodequad --list`. You can also change the driver and protocol by using
the `--driver <driver>` and `--protocol <protocol>` options.

To probe for available devices on all recognized communication ports, use: `nodequad --probe`. A JSON array of possible
vehicles to connect to, including their respective URI will be output and the program will exit. To connect to the first
found vehicle automatically (useful for quick testing), do the following: `nodequad --probe --connect`. This will probe 
available ports, connect to the first vehicle (if found) and return a 0 exit code if successful.

That's the basics of connecting to vehicles. Other commands allow you to monitor vehicle state, set flight configuration properties
and stream real-time state information. See the below examples and description for more information.

## OPTIONS

* `[--driver <name|path>]`
  The name of the driver from Aeroquad.drivers or a path to a file that implements a driver interface. Defaults to 'serial' driver.
* `[--protocol <name|path>]`
  The name of the protocol from Aeroquad.protocols or a path to a file that implements a protocol interface. Defaults to 'AQ32' driver.
* `[--list]`
  Returns json array of available ports given a communications driver.
* `[--probe]`
  Returns json array of available vehicles on all ports based on a heuristic.
* `[--connect <uri>]`
  Attempts connection to a given URI, or uses the first vehicle URI from a successful probe when used in combination with the `--probe` option.
* `[--subscribe <event>]`
  Subscribe to an event and receive notifications, JSON output, newline delimited.
* `[--sync <key> <value>]`
  Read or write key data. If a value is not specified, it is read from the vehicle. To set a value provide the value in JSON.
* `[--stream <key>]`
  Streams real-time state data from the vehicle for a given key.

## DEPENDENCIES

This application is written in javascript using node.js, and as such it requires a working node.js environment. Please see the project
page at (http://jleppert.github.io/nodequad/) for more information on making sure your node is properly working.

## DIRECTORIES

Since this is just an npm module, it is typically installed according to what npm does. You should refer to the npm documentation
for information on where this might be on your system. If you installed it with the global option, it should be in your PATH and
generally can be run from anywhere.

## DEVELOPER USAGE

Feel free to use this utility in anyway that works for you. However, this is mostly limited to simple functional tests and
rudimentary applications. For more complicated use cases, consider using the nodequad object API from within a node.js application.

## CONFIGURATION

You can use the `--driver` and `--protocol` options to define a custom driver and protocol (or one of Nodequad.drivers, or Nodequad.protocols).
Either specify the key name or a path to a file that implements a suitable driver or protocol interface.

## BUGS

If you've found a bug, that's great! Please report it at: (http://github.com/jleppert/nodequad/issues) and it will be promptly fixed.

## CONTRIBUTIONS

Contributions are welcome and encouraged! Please see the project page at (http://jleppert.github.io/nodequad/) for more information on how to
contribute.

## AUTHOR

[Johnathan Leppert](https://github.com/jleppert/) ::
[@iamleppert](http://twitter.com/iamleppert) ::
<johnathan.leppert@gmail.com>

## SEE ALSO

* npm(1)