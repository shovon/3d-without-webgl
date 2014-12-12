var gulp = require('gulp');
var browserify = require('browserify');
var del = require('del');
var source = require('vinyl-source-stream');
var webserver = require('gulp-webserver');
var path = require('path');
var runsequence = require('gulp-run-sequence');
var gutil = require('gulp-util');

/*
 * Handles an error event.
 */
function swallowError(error) {
  gutil.log(error);
  this.emit('end');
}

/*
 * Clears out all the stuff that have been generated during development.
 */
gulp.task('clean', function(done) {
  del(['./bundle.js'], done);
});

/*
 * Bundles the scripts, using Browserify.
 */
gulp.task('js', function() {
  return browserify('./src/app.js')
    .bundle()
    .on('error', function (err) {
      gutil.log(err);
      this.emit('end');
    })
    .pipe(source('bundle.js'))
    .on('error', swallowError)
    .pipe(gulp.dest('./'));
});

/*
 * Compiles the global styles, local styles, and the JavaSript/JSX code, and
 * puts the compiled code into the `build` folder. Injects the necessary
 * dpeendencies into the HTML.
 */
gulp.task('build', function (done) {
  return runsequence(
    'clean',
    'js',
    done
  );
});

/*
 * Watch for changes in files.
 */
gulp.task('watch', function() {
  gulp.watch(['src/**/*.js'], ['js']);
});

/*
 * Run the server.
 */
gulp.task('server', ['watch'], function () {
  return gulp.src('./')
    .pipe(webserver({
      livereload: true,
      open: true
    }));
});

/*
 * The default is meant for development. Watches for changes, runs the builds,
 * and fires up a web server. Also opens a new browser tab to the application.
 */
gulp.task('default', function () {
  return runsequence('build', ['watch', 'server']);
});