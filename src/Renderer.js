module.exports = Renderer;
function Renderer(width, height) {
  this.domElement = document.createElement('canvas');
  this.domElement.width = width;
  this.domElement.height = height;

  this.context = this.domElement.getContext('2d');
}

/*
 * Clears the canvas to black.
 */
Renderer.prototype.clear = function () {
  this.context.clearRect(0, 0, this.domElement.width, this.domElement.height);
  this.context.fillStyle = 'black';
  this.context.fillRect(0, 0, this.domElement.width, this.domElement.height);
};