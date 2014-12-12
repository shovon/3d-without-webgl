var gl = require('gl-matrix');

/*
 * A helper class to generate the perspective camera projection matrix.
 */
module.exports = Camera;
function Camera(fieldOfView, aspect, near, far) {
  this.position = gl.vec3.create();
  this.target = gl.vec3.create();
  this.up = gl.vec3.create();

  this.pMatrix = gl.mat4.create();
  gl.mat4.perspective(
    this.pMatrix,
    fieldOfView,
    aspect,
    0.1,
    1
  );
}

/*
 * Gets the transformation matrix, that will transform vertices such that they
 * can result in positions that will be plotted in a XY plane.
 *
 * @returns a float32 array, that represents a 4x4 matrix.
 */
Camera.prototype.getMatrix = function () {
  var pMatrix = gl.mat4.clone(this.pMatrix);
  gl.mat4.mul(
    pMatrix,
    pMatrix,
    gl.mat4.lookAt(
      gl.mat4.create(),
      this.position,
      this.target,
      this.up
    )
  );
  return pMatrix;
};