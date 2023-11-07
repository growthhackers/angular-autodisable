/* jshint strict: false */
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

var PATH = {
	src: [
		'src/autodisable.module.js',
		'src/autodisable.directive.js',
		'src/autodisable.factory.js'
	]
};

gulp.task('build', function() {
	return gulp.src(PATH.src)
		.pipe(concat('autodisable.js'))
		.pipe(gulp.dest('.'))
		.pipe(uglify())
		.pipe(gulp.dest('dist'));
});

gulp.task('watch', function () {
	gulp.watch(PATH.src, ['build']);
});