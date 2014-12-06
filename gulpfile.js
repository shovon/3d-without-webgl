var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var browserify = require('browserify');
var webserver = require('gulp-webserver');

/*
 * Handles an error event.
 */
function swallowError(error) {
  gutil.log(error);
  this.emit('end');
}

gulp.task('server', function () {
  return gulp.src('./')
    .pipe(webserver({
      livereload: true,
      open: true
    }));
});

gulp.task('browserify', function () {
  return browserify(['./app.js'])
    .bundle()
    .on('error', function (err) {
      // console.error(err.message);
      console.error(err);
    })
    .pipe(source('bundle.js'))
    .on('error', swallowError)
    .pipe(gulp.dest('./'));
});
 
gulp.task('watch', function() {
  gulp.watch(['./app.js'], ['browserify']);
});

gulp.task('default', ['watch', 'server']);