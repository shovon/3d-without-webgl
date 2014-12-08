var gl = require('gl-matrix');
var Face = require('./Face.js');

var WIDTH = 500;
var HEIGHT = 500;

var canvas;
var context;

var faces;

// Used in the z-buffer, for sorting planes by their farthest vector.
var bufferedSort = function (a, b) { return b.farthest() - a.farthest(); };

/*
 * Converts an RGB value into HSL. H will be in radians, while S and L will be
 * a scale between 0 and 1.
 *
 * @param vec3 a vector in R^3 representing a colour in RGB space. All its
 *   values are assumed to be clamped between 0 and 1
 * @returns a vector in R^3 representing a color in HSL space
 */
function rgbToHsl(vec3) {
  var r = vec3[0];
  var b = vec3[1];
  var g = vec3[2];

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if(max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2              ; break;
      case b: h = (r - g) / d + 4              ; break;
    }

    h %= 6;
    h = h*Math.PI / 6;
  }

  return gl.vec3.clone([h, s, l]);
}


/*
 * Converts an HSL color value into RGB color. R, G, and B will be a scale
 * between 0 and 1.
 *
 * @param vec3 a vector in R^3 representing a color in HSL space. H is assumed
 *   to be in radians, where as S and L are assumed to be between 0 and 1
 * @returns a vector in R^3 representing a color
 */
var hslToRgb = (function () {
  return function (vec3) {
    var r, g, b;

    h = vec3[0]/Math.PI;
    s = vec3[1];
    l = vec3[2];

    if(s === 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return gl.vec3.clone([r, g, b]);
  };

  function hue2rgb(p, q, t) {
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
}());


/*
 * Gets the angle between two vectors in R^3.
 *
 * @param aVec3 represents the first vector
 * @param bVec3 represents the second vector
 * @returns a number that represents the angle between the two vectors
 */
function getAngleVec3(aVec3, bVec3) {
  var cross = gl.vec3.length(gl.vec3.cross(aVec3, bVec3));
  return Math.atan2( cross, gl.vec3.dot(aVec3, bVec3) );
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
 * @param strength the light's strength
 * @param angle the light's width in radians
 * @param ambient a floating-point numbr that represents ambient lighting.
 * @param face the face to draw to the screen
 */
function drawFace(context, light, strength, angle, ambient, face) {
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
  var colorrgb = hslToRgb(color);
  drawPolygon(context, vectorToHexColor(colorrgb), newpoints);
}

function sphereCoordinate(x, y, max) {
  return gl.vec3.clone([
    Math.sin((y/max) * Math.PI)*Math.cos((x/max) * Math.PI*2),
    Math.cos((y/max) * Math.PI),
    Math.sin((y/max) * Math.PI)*Math.sin((x/max) * Math.PI*2)
  ]);
}

function createSphere() {
  var max = 30;

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
          rgbToHsl([1, 0, 0]),
          [ tl, tr, br, bl ],
          normal
        )
      )
    }
  }

  return faces;
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
  // faces = [];
  // for (var i = 0; i < _points.length; i += 3 * 4) {
  //   var face = [];
  //   for (var j = 0; j < 4; j++) {
  //     var _point = gl.vec3.create();
  //     _point[0] = _points[i + j*3    ];
  //     _point[1] = _points[i + j*3 + 1];
  //     _point[2] = _points[i + j*3 + 2];
  //     face.push(_point);
  //   }
  //   var nindex = i/(3*4);
  //   var normal = gl.vec3.create();
  //   normal[0] = normals[nindex*3];
  //   normal[1] = normals[nindex*3 + 1];
  //   normal[2] = normals[nindex*3 + 2];
  //   faces.push(new Face(rgbToHsl(colors[(i/(3*4)) % colors.length]), face, normal));
  // }
  faces = createSphere();
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
  gl.mat4.perspective(
    pMatrix, 45*Math.PI/180, canvas.width / canvas.height, 0.1, 1
  );
  gl.mat4.mul(
    pMatrix,
    pMatrix,
    gl.mat4.lookAt(
      gl.mat4.create(),
      [0, 0, -3],
      [0, 0, 0],
      [0, 1, 0]
    )
  );

  // Our rotation matrix.
  var rotMatrix = gl.mat4.create();

  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 1000, [0, 1, 0]);
  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 2000, [1, 0, 0]);
  gl.mat4.rotate(rotMatrix, rotMatrix, Date.now() / 3000, [0, 0, 1]);

  var buffered = [];

  for (var i = 0; i < faces.length; i++) {
    faces[i].rotationMatrix = rotMatrix;
    faces[i].perspectiveMatrix = pMatrix;
    faces[i].applyTransformation();
    if (i === 0) { faces[i].test = true; }
    buffered.push(faces[i]);
  }

  buffered.sort(bufferedSort);

  var light = gl.vec3.clone([1, 0, -2])

  for (var i = 0; i < buffered.length; i++) {
    drawFace(context, light, 1.5, Math.PI/2, 0, buffered[i]);
  }
}

init();
animate();
