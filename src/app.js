var gl = require('gl-matrix');
var Face = require('./Face.js');
var helpers = require('./helpers');
var Renderer = require('./Renderer');
var Camera = require('./Camera');

var WIDTH = 500;
var HEIGHT = 500;

var renderer;
var camera;
var faces;

// Used in the z-buffer, for sorting planes by their farthest vector.
var bufferedSort = function (a, b) {
  return b.getDistance() - a.getDistance();
};

function sphereCoordinate(x, y, max) {
  return gl.vec3.clone([
    Math.sin((y/max) * Math.PI)*Math.cos((x/max) * Math.PI*2),
    Math.cos((y/max) * Math.PI),
    Math.sin((y/max) * Math.PI)*Math.sin((x/max) * Math.PI*2)
  ]);
}

/*
 * Creates an array of faces that will comprise a sphere.
 *
 * @returns an array of faces
 */
function createSphere() {
  var max = 15;

  var faces = [];

  for (var i = 0; i < max; i++) {
    for (var j = 0; j < max; j++) {
      var tl = sphereCoordinate(i    , j + 1, max);
      var tr = sphereCoordinate(i + 1, j + 1, max);
      var br = sphereCoordinate(i + 1, j    , max);
      var bl = sphereCoordinate(i    , j    , max);

      var normal = gl.vec3.create();
      gl.vec3.add(normal, normal, tl);
      gl.vec3.add(normal, normal, tr);
      gl.vec3.add(normal, normal, br);
      gl.vec3.add(normal, normal, bl);
      gl.vec3.scale(normal, normal, 0.25);
      gl.vec3.normalize(normal, normal);

      faces.push(
        new Face(
          helpers.rgbToHsl([1, 0, 0]),
          [ tl, br, bl ],
          normal
        )
      );

      faces.push(
        new Face(
          helpers.rgbToHsl([1, 0, 0]),
          [ tl, tr, br ],
          normal
        )
      );
    }
  }

  return faces;
}

/*
 * Creates an array of faces that will comprise a cube.
 *
 * @returns an array of faces
 */
function createCube() {
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
    var nindex = i/(3*4);
    var normal = gl.vec3.create();
    normal[0] = normals[nindex*3];
    normal[1] = normals[nindex*3 + 1];
    normal[2] = normals[nindex*3 + 2];
    faces.push(new Face(helpers.rgbToHsl(colors[(i/(3*4)) % colors.length]), face, normal));
  }
  return faces;
}

/*
 * Initializes the scene.
 */
function init() {
  renderer = new Renderer(WIDTH, HEIGHT);

  // Append the canvas object.
  document.body.appendChild(renderer.domElement);

  camera = new Camera(
    45*Math.PI/180,
    renderer.domElement.width / renderer.domElement.height,
    1,
    1000
  );

  faces = createSphere();
  // faces = createCube();
}

/*
 * Runs the animations.
 */
function animate() {
  requestAnimationFrame(animate);

  // Clears the canvas.
  renderer.clear();

  // Our perspective matrix.

  camera.position = [0, 0, -3];
  camera.target = [0, 0, 0];
  camera.up = [0, 1, 0];

  var pMatrix = camera.getMatrix();

  // Our rotation matrix.
  var rotMatrix = gl.mat4.create();

  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 1000, [0, 1, 0]);
  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 2000, [1, 0, 0]);
  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 3000, [0, 0, 1]);

  var buffered = [];

  for (var i = 0; i < faces.length; i++) {
    if (i === 0) { faces[i].test = true; }
    faces[i].rotationMatrix = rotMatrix;
    faces[i].perspectiveMatrix = pMatrix;
    faces[i].applyTransformation();
    buffered.push(faces[i]);
  }

  buffered.sort(bufferedSort);

  var light = gl.vec3.clone([
    -Math.cos(Date.now() / 2000),
    0,
    -Math.sin(Date.now() / 2000)
  ]);

  for (var i = 0; i < buffered.length; i++) {
    buffered[i].draw(renderer, light);
  }
}

init();
animate();
