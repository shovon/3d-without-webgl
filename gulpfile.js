var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var browserify = require('browserify');
var webserver = require('gulp-webserver');

var SRC = './';
var APPJS = './src/app.js';

/*
 * Handles an error event.
 */
function swallowError(error) {
  gutil.log(error);
  this.emit('end');
}

gulp.task('server', function () {
  return gulp.src(SRC)
    .pipe(webserver({
      livereload: true,
      open: true
    }));
});

gulp.task('browserify', function () {
  return browserify([APPJS])
    .bundle()
    .on('error', function (err) {
      console.error(err.message);
      // console.error(err);
    })
    .pipe(source('bundle.js'))
    .on('error', swallowError)
    .pipe(gulp.dest(SRC));
});
gulp.task('build', ['browserify']);
 
gulp.task('watch', function() {
  gulp.watch(['./src/*.js'], ['browserify']);
});

gulp.task('default', ['watch', 'server']);