# TOC
   - [lib/drivers/serial.js](#libdriversserialjs)
     - [object](#libdriversserialjs-object)
     - [object](#libdriversserialjs-object)
       - [without a uri](#libdriversserialjs-constructor-without-a-uri)
       - [with a uri](#libdriversserialjs-constructor-with-a-uri)
     - [.connect](#libdriversserialjs-connect)
       - [without a uri](#libdriversserialjs-connect-without-a-uri)
       - [with a uri](#libdriversserialjs-connect-with-a-uri)
     - [.disconnect](#libdriversserialjs-disconnect)
     - [.list](#libdriversserialjs-list)
     - [.probe](#libdriversserialjs-probe)
     - [.send](#libdriversserialjs-send)
     - [.getStream](#libdriversserialjs-getstream)
<a name=""></a>
 
<a name="libdriversserialjs"></a>
# lib/drivers/serial.js
<a name="libdriversserialjs-object"></a>
## object
should implement eventemitter.

```js
assert.equal(SerialDriver.super_, EventEmitter);
```

should expose states.

```js
assert.deepProperty(SerialDriver, 'states.DISCONNECTED');
assert.deepProperty(SerialDriver, 'states.CONNECTING');
assert.deepProperty(SerialDriver, 'states.CONNECTED');
assert.deepProperty(SerialDriver, 'states.READY');
assert.deepProperty(SerialDriver, 'states.TRANSMITTING');
assert.deepProperty(SerialDriver, 'states.RECEIVING');
assert.deepProperty(SerialDriver, 'states.BACKOFF');
```

<a name="libdriversserialjs-constructor"></a>
## constructor
<a name="libdriversserialjs-constructor-without-a-uri"></a>
### without a uri
should construct a SerialDriver.

```js
assert.ok(driver instanceof SerialDriver);
```

should start in a disconnected state without a driver and empty uri .

```js
assert.equal(driver.getState(), SerialDriver.states.DISCONNECTED);
assert.isUndefined(driver.connection.driver);
assert.deepEqual(driver.connection.uri, {});
```

should start with an empty queue, backoffs, and discovered ports.

```js
assert.deepEqual(driver.queue, []);
assert.deepEqual(driver.backOffs, []);
assert.deepEqual(driver.foundPorts, []);
```

should have a backoff listener.

```js
assert.isFunction(driver.backOff.handlers.backoff);
```

<a name="libdriversserialjs-constructor-with-a-uri"></a>
### with a uri
should accept a uri that is available.

```js
var	oldList = SerialDriver.prototype.list;
if(MOCK) SerialDriver.prototype = mockList(SerialDriver.prototype);
var driver = new SerialDriver(URI);
var url = require('url'); 
assert.deepEqual(driver.connection.uri, url.parse(URI));
if(MOCK) SerialDriver.prototype.list = oldList;
```

should construct a SerialDriver.

```js
assert.ok(driver instanceof SerialDriver);
```

should start in a disconnected state without a driver and empty uri .

```js
assert.equal(driver.getState(), SerialDriver.states.DISCONNECTED);
assert.isUndefined(driver.connection.driver);
assert.deepEqual(driver.connection.uri, {});
```

should start with an empty queue, backoffs, and discovered ports.

```js
assert.deepEqual(driver.queue, []);
assert.deepEqual(driver.backOffs, []);
assert.deepEqual(driver.foundPorts, []);
```

should have a backoff listener.

```js
assert.isFunction(driver.backOff.handlers.backoff);
```

<a name="libdriversserialjs-connect"></a>
## .connect
<a name="libdriversserialjs-connect-without-a-uri"></a>
### without a uri
uses the uri attached to the instance.

```js
var driver = new Driver(URI);
	cb 	   = sinon.spy();
driver.connect(undefined, cb);
assert.ok(cb.calledOnce);
assert.ok(cb.neverCalledWith('No URI available'));
assert.ok(cb.calledWith(undefined, url.parse(URI)));
assert.ok(cb.calledOn(driver));
assert.deepEqual(driver.connection.uri, url.parse(URI));
```

transitions state: connecting -> connected on successful connection.

```js
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
```

transitions state: connecting -> disconnected on unsuccessful connection.

```js
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
```

<a name="libdriversserialjs-connect-with-a-uri"></a>
### with a uri
uses the provided uri.

```js
var driver = new Driver(undefined);
    cb     = sinon.spy();
driver.connect(URI, cb);
assert.ok(cb.calledOnce);
assert.ok(cb.neverCalledWith('No URI available'));
assert.ok(cb.calledWith(undefined, url.parse(URI)));
assert.ok(cb.calledOn(driver));
assert.deepEqual(driver.connection.uri, url.parse(URI));
```

transitions state: connecting -> connected on successful connection.

```js
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
```

transitions state: connecting -> disconnected on unsuccessful connection.

```js
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
```

