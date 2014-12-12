var gl = require('gl-matrix');
var Object3D = require('./Object3D');
var util = require('util');
var helpers = require('./helpers');

/*
 * Converts a number to a 0-padded, hexadecimal string.
 *
 * @param num a number that is between 0 and 255.
 * @returns a string that represents a hexadecimal number between 0 and 255
 */
function numToHexString(num) {
  return num < 0x10 ? '0' + num.toString(16) : num.toString(16);
}

/*
 * Converts the tiny color format into a vector of degree 3.
 *
 * @param color an object from the tinycolor library, representing a colour
 * @returns a vector in R^3
 */
function vec3FromColor(color) {
  var rgb = color.toRgb();
  var rgbClone = gl.vec3.clone([rgb.r, rgb.g, rgb.b]);
  return gl.vec3.scale(
    gl.vec3.create(), rgbClone, 1/255
  );
}

/*
 * Converts a vector in R^3 into a hexadecimal-encoded colour. Used for giving
 * a plane color.
 *
 * @param vec3 is a vector in R^3, representing a colour
 * @returns a string
 */
function vectorToHexColor(vec3) {
  // Extracts the red, green, and blue components.
  var r = Math.floor(vec3[0]*255);
  var g = Math.floor(vec3[1]*255);
  var b = Math.floor(vec3[2]*255);

  // Clamps the components between 0 to 255
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;

  // Converts the components into a 0-padded, hexadecimal string.
  var rstr = numToHexString(r);
  var gstr = numToHexString(g);
  var bstr = numToHexString(b);
  
  return '#' + rstr + gstr + bstr;
}

/*
 * Tells the renderer (`context`) to draw a coloured polygon.
 *
 * @param context the renderer
 * @param color the color of our polygon
 * @param points the vertices of our polygon
 */
function drawPolygon(renderer, color, points) {
  var context = renderer.context;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(
    points[0][0] * 100 + renderer.domElement.width / 2, -points[0][1] * 100 + renderer.domElement.height / 2
  );
  for (var i = 1; i < points.length; i++) {
    context.lineTo(
      points[i][0] * 100 + renderer.domElement.width / 2, -points[i][1] * 100 + renderer.domElement.height / 2
    );
  }
  context.closePath();
  context.fill();
}

/*
 * Draws a face. Uses the `Face` classe's `points4` property to grab the
 * coordinates.
 *
 * @param context the renderer to draw to
 * @param light the position of the light
 * @param strength the light's strength
 * @param angle the light's width in radians
 * @param ambient a floating-point numbr that represents ambient lighting.
 * @param face the face to draw to the screen
 */
function drawFace(renderer, light, strength, angle, ambient, face) {
  angle = angle > Math.PI ? Math.PI : angle < 0 ? 0 : angle; angle /= Math.PI;
  light = gl.vec3.normalize(gl.vec3.clone(light), light);
  // gl.vec3.scale(light, light, -1);
  var points = face.vertices4;
  var newpoints = [];
  for (var i = 0; i < points.length; i++) {
    var point = points[i];

    // Divides the x and y coordinates by the fourth component.
    point[0] /= point[3];
    point[1] /= point[3];
    newpoints.push(point);
  }

  var coefficient = Math.max((gl.vec3.dot(light, face.normal4) - 1 + angle)/angle, 0);
  var color = gl.vec3.clone(face.color);
  color[2] = color[2] * coefficient * strength + ambient;
  var colorrgb = helpers.hslToRgb(color);
  drawPolygon(renderer, vectorToHexColor(colorrgb), newpoints);
}

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

function vec3ToHomogeneous(vec3) {
  var vec4 = gl.vec4.create();
  vec4[0] = vec3[0];
  vec4[1] = vec3[1];
  vec4[2] = vec3[2];
  vec4[3] = 1;
  return vec4;
}

/*
 * Represents a single face.
 *
 * @constructor
 * @param a vector in R^3 that represents the color in HSL space
 * @param points a string that represents the points that comprise the face
 */
module.exports = PerVertexFace;
function PerVertexFace(color, vertices, normals) {
  this.color = color;
  this.vertices = vertices;
  this.normals = normals;

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
  this.normals4 = [];
  // this.normals4[0] = normal[0];
  // this.normals4[1] = normal[1];
  // this.normals4[2] = normal[2];
  // this.normals4[3] = 1;
  for (var i = 0; i < normals.length; i++) {
    this.normals4.push(vec3ToHomogeneous(normals[i]));
  }

  // This is our rotation matrix. Set it to the id
  this.rotationMatrix = gl.mat4.create();

  // This is our perspective camera. Set it to the identity matrix for now.
  this.perspectiveMatrix = gl.mat4.create();
}

util.inherits(Face, Object3D);

/*
 * Applies the transformation based on the product of the perspective matrix
 * and the 
 */
PerVertexFace.prototype.applyTransformation = function () {
  // This is the transformation that should be applied to the vertices.
  var transform = gl.mat4.clone(this.rotationMatrix);

  // Simply change the rotation on the normal. No translation or anything.
  // this.normal4 = transformVector(transform, this.normal);
  for (var i = 0; i < this.normals4.length; i++) {
    this.normals4[i] = transformVector(transform, this.normals4[i]);
  }
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
PerVertexFace.prototype.closest = function () {
  return this._closest;
};

/*
 * Gets the value of the point that has the highest value for the z-coordinate.
 */
PerVertexFace.prototype.farthest = function () {
  return this._farthest;
};

PerVertexFace.prototype.getDistance = function () {
  return this.farthest();
};

PerVertexFace.prototype.draw = function (renderer, light) {
  drawFace(renderer, light, 1.2, Math.PI/2, 0.09, this);
};
