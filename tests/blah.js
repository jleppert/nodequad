var O = require('observed');

var obj = { name: {} };
var ee = O(obj);

ee.on('change', function(ev) {
	console.dir(ev);
});

obj.name.last = 'something';

obj.something = {};
ee.deliverChanges();
obj.something.blah = [];

obj.something.blah.push('test');

obj.something.blah.push('hello');

obj.something.chris = [];

obj.something.dave = {};
obj.something.dave.brian = 'terst';