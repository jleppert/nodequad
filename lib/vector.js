function Vector(x, y, z) {
	this.x = parseFloat(x);
	this.y = parseFloat(y); 
	this.z = parseFloat(z);
}

Vector.PRECISION = 2;

Vector.prototype.toJSON = function toJSON() {
	return [this.x.toFixed(Vector.PRECISION), this.y.toFixed(Vector.PRECISION), this.z.toFixed(Vector.PRECISION)];
};

Vector.deserialize = function(val) {
	return new Vector(val[0], val[1], val[2]);
};

module.exports = Vector;