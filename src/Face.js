var gl = require('gl-matrix');

/*
 * Returns a vector in R^4, with the "transformation" applied to the homogenous
 * equivalent of the supplied vector (vec3).
 *
 * @param transform the 4x4 transformation matrix
 * @param vec3 the vector in R^3 to "transform"
 * @returns a vector in R^4
 */
function transformVector(transform, vec3) {
  var point4 = gl.vec4.create();
  point4[0] = vec3[0];
  point4[1] = vec3[1];
  point4[2] = vec3[2];
  point4[3] = 1;

  gl.vec4.transformMat4(point4, point4, transform);

  return point4;
}

/*
 * Represents a single face.
 *
 * @constructor
 * @param a vector in R^3 that represents the color in HSL space
 * @param points a string that represents the points that comprise the face
 */
module.exports = Face;
function Face(color, vertices, normal) {
  this.color = color;
  this.vertices = vertices;
  this.normal = normal;

  this._closest = Number.POSITIVE_INFINITY;
  this._farthest = Number.NEGATIVE_INFINITY;

  // Initializes homogeneous coordinates for our vertices.
  this.vertices4 = [];
  for (var i = 0; i < vertices.length; i++) {
    var vertex = gl.vec4.create();
    vertex[0] = vertices[i][0];
    vertex[1] = vertices[i][1];
    vertex[2] = vertices[i][2];
    vertex[3] = 1;
    this.vertices4.push(vertex);
  }

  // Initializes a homogeneous coordinate for the normal.
  this.normal4 = [];
  this.normal4[0] = normal[0];
  this.normal4[1] = normal[1];
  this.normal4[2] = normal[2];
  this.normal4[3] = 1;

  // This is our rotation matrix. Set it to the id
  this.rotationMatrix = gl.mat4.create();

  // This is our perspective camera. Set it to the identity matrix for now.
  this.perspectiveMatrix = gl.mat4.create();
}

/*
 * Applies the transformation based on the product of the perspective matrix
 * and the 
 */
Face.prototype.applyTransformation = function () {
  // This is the transformation that should be applied to the vertices.
  var transform = gl.mat4.clone(this.rotationMatrix);

  // Simply change the rotation on the normal. No translation or anything.
  this.normal4 = transformVector(transform, this.normal);
  var point = [0, 0, -1];

  // Now, get the matrix that will apply the transformation on the matrices.
  gl.mat4.mul(transform, this.perspectiveMatrix, transform);

  // Used for caching the closest and farthest vertices.
  var closest = Number.POSITIVE_INFINITY;
  var farthest = Number.NEGATIVE_INFINITY;

  for (var i = 0; i < this.vertices4.length; i++) {
    this.vertices4[i] = transformVector(transform, this.vertices[i]);
    if (this.vertices4[i][2] < closest) {
      closest = this.vertices4[i][2];
    }
    if (this.vertices4[i][2] > farthest) {
      farthest = this.vertices4[i][2];
    }
  }

  this._farthest = farthest;
  this._closest = closest;
};

/*
 * Gets the value of the point that has the lowest value for the z-coordinate.
 */
Face.prototype.closest = function () {
  return this._closest;
};

/*
 * Gets the value of the point that has the highest value for the z-coordinate.
 */
Face.prototype.farthest = function () {
  return this._farthest;
};
