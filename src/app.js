var gl = require('gl-matrix');
var Face = require('./Face.js');
var tinycolor = require('tinycolor2');

var WIDTH = 500;
var HEIGHT = 500;

var canvas;
var context;

var faces;

var bufferedSort = function (a, b) {
  return b.farthest() - a.farthest();
};

/*
 * Gets the angle between two vectors in R^3.
 *
 * @param aVec3 represents the first vector
 * @param bVec3 represents the second vector
 * @returns a number that represents the angle between the two vectors
 */
function getAngleVec3(aVec3, bVec3) {
  var dot = gl.vec3.dot(aVec3, bVec3);
  var lenA = gl.vec3.length(aVec3);
  var lenB = gl.vec3.length(bVec3);
  return Math.acos( dot / (lenA * lenB) );
}

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
 * Converts a vector in R^3 into a hexadecimal-encoded colour.
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
function drawPolygon(context, color, points) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(
    points[0][0] * 100 + WIDTH / 2, -points[0][1] * 100 + HEIGHT / 2
  );
  for (var i = 1; i < points.length; i++) {
    context.lineTo(
      points[i][0] * 100 + WIDTH / 2, -points[i][1] * 100 + HEIGHT / 2
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
 * @param face the face to draw to the screen
 */
function drawFace(context, light, face) {
  light = gl.vec3.clone(light);
  gl.vec3.scale(light, light, -1);
  var points = face.vertices4;
  var newpoints = [];
  for (var i = 0; i < points.length; i++) {
    var point = points[i];

    // Divides the x and y coordinates by the fourth component.
    point[0] /= point[3];
    point[1] /= point[3];
    newpoints.push(point);
  }
  // Get the angle between 0 and Math.PI / 2.
  var angle = getAngleVec3(light, face.normal4) / (Math.PI/2);
  if (angle < 0 || angle > Math.PI) { angle = 0; }
  var coefficient = angle / (Math.PI / 2);
  var color = tinycolor.fromRatio({
    r: face.color[0],
    g: face.color[1],
    b: face.color[2]
  });
  var lightenAmount = Math.log(coefficient*coefficient*coefficient);
  color.lighten(lightenAmount*10);
  drawPolygon(context, vectorToHexColor(vec3FromColor(color)), newpoints);
}

/*
 * Initializes the scene.
 */
function init() {
  // Create a new Canvas element.
  canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Get the renderer.
  context = canvas.getContext('2d');

  // Append the canvas object.
  document.body.appendChild(canvas);

  // Our vertices.
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

  // The normals of our faces.
  var normals = [
     0,  0,  1,
     0,  0, -1,
     1,  0,  0,
    -1,  0,  0,
     0,  1,  0,
     0, -1,  0
  ];

  // The colours of our faces.
  var colors = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0, 1, 1],
    [1, 1, 0],
    [1, 0, 1]
  ];

  // Initialize our faces.
  faces = [];
  for (var i = 0; i < _points.length; i += 3 * 4) {
    var face = [];
    for (var j = 0; j < 4; j++) {
      var _point = gl.vec3.create();
      _point[0] = _points[i + j*3    ];
      _point[1] = _points[i + j*3 + 1];
      _point[2] = _points[i + j*3 + 2];
      face.push(_point);
    }
    var nindex = i/(3*4);
    var normal = gl.vec3.create();
    normal[0] = normals[nindex*3];
    normal[1] = normals[nindex*3 + 1];
    normal[2] = normals[nindex*3 + 2];
    faces.push(new Face(colors[(i/(3*4)) % colors.length], face, normal));
  }
}

/*
 * Runs the animations.
 */
function animate() {
  requestAnimationFrame(animate);

  // Clears the canvas.
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = 'black';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Our perspective matrix.
  var pMatrix = gl.mat4.create();
  gl.mat4.perspective(pMatrix, 45*Math.PI/180, canvas.width / canvas.height, 0.1, 100);
  gl.mat4.mul(pMatrix, pMatrix, gl.mat4.lookAt(gl.mat4.create(), [0, 2, -3], [0, 0, 0], [0, 1, 0]));

  // Our rotation matrix.
  var rotMatrix = gl.mat4.create();

  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 1000, [0, 1, 0]);
  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 1000, [1, 0, 0]);

  var buffered = [];

  for (var i = 0; i < faces.length; i++) {
    faces[i].rotationMatrix = rotMatrix;
    faces[i].perspectiveMatrix = pMatrix;
    faces[i].applyTransformation();
    if (i === 0) { faces[i].test = true; }
    buffered.push(faces[i]);
  }

  buffered.sort(bufferedSort);

  var light = gl.vec3.clone([0, 0, 1])

  for (var i = 0; i < buffered.length; i++) {
    drawFace(context, light, buffered[i]);
  }
}

init();
animate();
