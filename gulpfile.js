'use strict';

var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    browserify = require('browserify'),
    watchify = require('watchify'),
    babelify = require('babelify'),
    browserSync = require('browser-sync').create(),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    minifyCss = require('gulp-minify-css'),
    gulpFilter = require('gulp-filter'),
    mainBowerFiles = require('main-bower-files'),
    RevAll = require('gulp-rev-all'),
    runSequence = require('run-sequence'),
    lrload = require('livereactload'),
    shell = require('gulp-shell'),
    del = require('del');

gulp.task('nodemon', ['bundle-css', 'bower', 'icons', 'watch-css', 'watchify', 'browser-sync'], function(){
	runSequence('revision', function(){
    nodemon({
      script: 'app.js',
      ext: 'js html json',
      execMap: {
        js: "node --harmony"
      }
    }).on('restart');
  });
});

gulp.task('browser-sync', function(){
  browserSync.init({
      proxy: 'localhost:3333',
      port: '3001',
      open: false
  });
});

gulp.task('production:push', function(){
  runSequence('precompile:assets', 'revision', 'git:push', 'heroku:push', function(){
    console.log('production push complete');
  });
});

gulp.task('precompile:assets', ['bundle-css', 'bower', 'icons', 
                              'browserify:production']);

gulp.task('git:push', shell.task([
  "git add -A",
  "git commit -m 'precompile for production'",
  "git push"
]));

gulp.task('heroku:push', shell.task([
  "git push heroku master"
]));

gulp.task('bundle-css', function(){
  return gulp.src('./assets/css/*.scss')
    .pipe(sass({
    		style: 'compressed',
    		includePaths: [
    			'./bower_components/bootstrap-sass/assets/stylesheets'
    		]
    	}).on('error', sass.logError))
    .pipe(concat('bundle.css'))
    .pipe(gulp.dest('public/css'))
    .pipe(browserSync.stream())
    .pipe(rename('bundle.min.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest('public/css'));
});

gulp.task('bower', function(){
	return gulp.src(mainBowerFiles())
    .pipe(gulpFilter('*.js'))
    .pipe (concat("vendor.js"))
    .pipe(gulp.dest('./public/js'))
    .pipe (rename("vendor.min.js"))
    .pipe(uglify())
    .pipe(gulp.dest('./public/js'));
});

gulp.task('icons', function() { 
  return gulp.src('./bower_components/bootstrap-sass/assets/fonts/bootstrap/**.*') 
    .pipe(gulp.dest('./public/fonts/bootstrap')); 
});

gulp.task('watch-css', function () {
  return gulp.watch('./assets/css/*.scss', ['bundle-css']);
});

gulp.task('browserify', function() {
  const b = getBrowserifyInstance('dev');
  b.transform(babelify);
  return bundleBrowserify(b);
});

gulp.task('browserify:production', function() {
  const b = getBrowserifyInstance('production');
  b.transform(babelify);
  return bundleBrowserify(b);
});

gulp.task('watchify', function(){
	var b = getBrowserifyInstance();
	var w = watchify(b);

	w.transform(babelify, {});
	w.on('update', function(){
		console.log('updating bundle');
		bundleBrowserify(w);
	});
	return bundleBrowserify(w);
});

gulp.task('revision', function(){
  runSequence('revision:assets');
});

gulp.task('revision:assets', function(){

  var revAll = new RevAll({
                      dontRenameFile: ['.jade'],
                      prefix: '/cdn'
                    });

  del('public/cdn/**');

  gulp.src(['public/css/*.min.css', 'public/js/*.min.js', 'public/fonts/**', 'public/*.jade'], {base: 'public'})
      .pipe(revAll.revision())
      .pipe(gulp.dest('public/cdn'));
});

var getBrowserifyInstance = function(env) {
	var b = browserify('assets/js/app.jsx', {
		extensions: ['.jsx'],
    // live reload
    plugin: (env === 'production') ? [] : [lrload],
		// watchify arguments
		cache: {},
		packageCache: {},
    fullPaths: false
	});

	return b;
}

var bundleBrowserify = function(b){
	return b
		.bundle(function(err){
      if(err){
        console.log(err.message);
      } else {
        console.log('bundle done');
      }
    })
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('public/js'))
    .pipe(rename('bundle.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('public/js'));
}

gulp.task('default', ['nodemon']);