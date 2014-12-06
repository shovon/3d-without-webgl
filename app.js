var gl = require('gl-matrix');

var WIDTH = 500;
var HEIGHT = 500;

// Create a new canvas element, and set its width and height.
var canvas = document.createElement('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Append the canvas object.
document.body.appendChild(canvas);

// Get the renderer.
var context = canvas.getContext('2d');

/*
 * Tells the renderer (`context`) to draw a coloured polygon.
 *
 * @param context the renderer
 * @param color the color of our polygon
 * @param points the vertices of our polygon
 */
function drawPolygon(context, color, points) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(points[0][0] * 100 + WIDTH / 2, -points[0][1] * 100 + HEIGHT / 2);
  for (var i = 1; i < points.length; i++) {
    context.lineTo(points[i][0] * 100 + WIDTH / 2, -points[i][1] * 100 + HEIGHT / 2);
  }
  context.closePath();
  context.fill();
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

/*
 * Draws a face. Uses the `Face` classe's `points4` property to grab the
 * coordinates.
 *
 * @param context the renderer to draw to
 * @param points the list of points.
 */
function drawFace(context, face) {
  var points = face.points4;
  var newpoints = [];
  for (var i = 0; i < points.length; i++) {
    var point = points[i];
    point[0] /= point[3];
    point[1] /= point[3];
    newpoints.push(point);
  }
  drawPolygon(context, face.color, newpoints);
}

/*
 * Represents a single face.
 *
 * @constructor
 * @param color a string that represents the face's colour, in HTML format
 * @param points a string that represents the points that comprise the face
 */
function Face(color, points) {
  this.color = color;
  this.points = points;
  this._closest = Number.POSITIVE_INFINITY;

  this.points4 = [];

  for (var i = 0; i < points.length; i++) {
    var point = gl.vec4.create();
    point[0] = points[i][0];
    point[1] = points[i][1];
    point[2] = points[i][2];
    point[3] = 1;
    this.points4.push(point);
  }
}

/*
 * Applies a transform to this face's homogeneous coordinates. Subsequent
 * `transform` calls to `applyTransform` disregards the old transformation.
 *
 * @param transform 
 */
Face.prototype.applyTransform = function (transform) {
  var closest = Number.POSITIVE_INFINITY;
  var farthest = Number.NEGATIVE_INFINITY;
  for (var i = 0; i < this.points4.length; i++) {
    this.points4[i] = transformVector(transform, this.points[i]);
    if (this.points4[i][2] < closest) {
      closest = this.points4[i][2];
    }
    if (this.points4[i][2] > farthest) {
      farthest = this.points4[i][2];
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
}

/*
 * Gets the value of the point that has the highest value for the z-coordinate.
 */
Face.prototype.farthest = function () {
  return this._farthest;
}

var point = gl.vec3.create();
point[0] = -1;
point[1] =  1;
point[0] =  1;

var _points = [
  -1,  1,  1,
   1,  1,  1,
   1, -1,  1,
  -1, -1,  1,

  -1,  1, -1,
   1,  1, -1,
   1, -1, -1,
  -1, -1, -1,

   1,  1, -1,
   1, -1, -1,
   1, -1,  1,
   1,  1,  1,

  -1,  1, -1,
  -1, -1, -1,
  -1, -1,  1,
  -1,  1,  1,

  -1,  1, -1,
   1,  1, -1,
   1,  1,  1,
  -1,  1,  1,

  -1, -1, -1,
   1, -1, -1,
   1, -1,  1,
  -1, -1,  1,
];

var colors = [
  'red',
  'green',
  'blue',
  'cyan',
  'magenta',
  'yellow'
];

var faces = [];
for (var i = 0; i < _points.length; i += 3 * 4) {
  var face = [];
  for (var j = 0; j < 4; j++) {
    var _point = gl.vec3.create();
    _point[0] = _points[i + j*3    ];
    _point[1] = _points[i + j*3 + 1];
    _point[2] = _points[i + j*3 + 2];
    face.push(_point);
  }
  faces.push(new Face(colors[(i/(3*4)) % colors.length], face));
}

function bufferedSort(a, b) {
  return b.farthest() - a.farthest();
}

function animate() {
  requestAnimationFrame(animate);

  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = 'black';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  var pMatrix = gl.mat4.create();

  gl.mat4.perspective(pMatrix, 45*Math.PI/180, canvas.width / canvas.height, 0.1, 100);
  gl.mat4.mul(pMatrix, pMatrix, gl.mat4.lookAt(gl.mat4.create(), [0, 2, -3], [0, 0, 0], [0, 1, 0]));
  
  // TODO: have the transformation done on a separate matrix.
  gl.mat4.rotate(pMatrix, pMatrix, Date.now() / 1000, [0, 1, 0]);
  gl.mat4.rotate(pMatrix, pMatrix, Date.now() / 1000, [1, 0, 0]);

  var buffered = [];

  for (var i = 0; i < faces.length; i++) {
    faces[i].applyTransform(pMatrix);
    buffered.push(faces[i]);
  }

  buffered.sort(bufferedSort);

  for (var i = 0; i < buffered.length; i++) {
    drawFace(context, buffered[i]);
  }
}

animate();
