var gl = require('gl-matrix');

/*
 * Converts an RGB value into HSL. H will be in radians, while S and L will be
 * a scale between 0 and 1.
 *
 * @param vec3 a vector in R^3 representing a colour in RGB space. All its
 *   values are assumed to be clamped between 0 and 1
 * @returns a vector in R^3 representing a color in HSL space
 */
module.exports.rgbToHsl = rgbToHsl;
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
module.exports.hslToRgb = (function () {
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