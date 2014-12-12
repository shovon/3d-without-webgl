var util = require('util');
var Object3D = require('./Object3D');

module.exports = Dot;
function Dot() {
}

util.inherits(Dot, Object3D);

Object3D.prototype.getDistance = function () {
  return this.position;
};

Object3D.prototpe.draw = function (context) {
  
};