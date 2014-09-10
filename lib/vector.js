/**
 * Vector object to store and handle three related floating point values
 * @constructor
 * @param {String} x
 * @param {String} y
 * @param {String} z
 */
function Vector(x, y, z) {
	this.x = parseFloat(x);
	this.y = parseFloat(y); 
	this.z = parseFloat(z);
}

/**
 * Precision used in rounding during serialization/deserialization
 * @type {Integer}
 */
Vector.PRECISION = 2;

/**
 * Get the serailized JSON representation of the object
 * @return     {String} JSON text of object state
 */
Vector.prototype.toJSON = function toJSON() {
	return [this.x.toFixed(Vector.PRECISION), this.y.toFixed(Vector.PRECISION), this.z.toFixed(Vector.PRECISION)];
};

/**
 * Creates a Vector object from a previously serialized JSON array
 * @param {Array} x
 * @return {Object} new Vector object
 */
Vector.deserialize = function(val) {
	return new Vector(val[0], val[1], val[2]);
};
/**
 * -
 *
 * @ignore
 */
module.exports = Vector;