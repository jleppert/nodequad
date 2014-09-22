var gulp 	  = require('gulp'),
	gutil     = require('gulp-util'),
	through   = require('through2'),
	del  	  = require('del'),
	changed   = require('gulp-changed'),
	markdown  = require('gulp-markdown'),
	Ronn      = require('ronn').Ronn,
	marked    = require('marked'),
	spawn     = require('child_process').spawn,
	connect   = require('gulp-connect'),
	jsdoc     = require('gulp-jsdoc'),
	mocha     = require('gulp-mocha'),
    istanbul  = require('gulp-istanbul'),
    coveralls = require('gulp-coveralls'),
	PACKAGE  = require('./package.json');

var sourcePaths = {
	js: ['lib', 'examples', 'tests', 'bin', 'perf'],
	ignoreJs: ['drivers/index.js', 'protocols/index.js'],
	implFiles: ['index.js', 'lib/**/*.js'],
    jsFiles: ['lib/**/*.js', 'examples/**/*.js', 'tests/**/*.js', 'bin/**/*.js', 'perf/**/*.js'],
	testFiles: ['tests/**/*.js'],
	md: ['README.md', 'CHANGELOG.md'],
	man: ['man/NODEQUAD-CLI.md'],
	docTpl: 'etc/docs.jade',
	docMd: 'etc/API.md',
    coverCov: 'coverage/lcov.info'
};

var destPaths = {
	md: 'release/doc',
	man: 'release/man',
	js: 'release/doc'
};

var gulpRonn = function(options) {
	return through.obj(function(file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-ronn', 'Streaming not supported'));
			return;
		}

		var ronn = new Ronn(file.contents.toString(), PACKAGE.version, PACKAGE.name);
		file.contents = new Buffer(ronn.roff());
		file.path = gutil.replaceExtension(file.path, '.1');
		cb(null, file);
	});
}; 

// cleans release directory of generated docs, markdown, man page, coverage report, perf report
gulp.task('clean', function(cb) {
  del([destPaths.md, destPaths.man, destPaths.js], cb);
});

// generates markdown HTML docs
gulp.task('docs:md-to-html', function() {
	return gulp.src(sourcePaths.md)
			.pipe(changed(destPaths.md))
			.pipe(markdown())
			.pipe(gulp.dest(destPaths.md));
});

// generates man page for CLI
gulp.task('docs:md-to-man', function() {
	return gulp.src(sourcePaths.man)
			.pipe(changed(destPaths.man))
			.pipe(gulpRonn())
			.pipe(gulp.dest(destPaths.man));
});

// generates API documentation from source
gulp.task('docs:jsdoc-to-html', function() {
	sourcePaths.js.forEach(function(jsSourcePath) {
		var doxx = spawn('doxx', ['--title', PACKAGE.name, '--readme', sourcePaths.docMd, '--template', sourcePaths.docTpl, '--ignore', sourcePaths.ignoreJs.join(','), '--source', jsSourcePath, '--target', destPaths.js + '/' + jsSourcePath]);
	});

});

// generates API documentation from source
gulp.task('docs:jsdoc-to-html2', function() {
	gulp.src(sourcePaths.jsFiles.concat(sourcePaths.md))
  		.pipe(jsdoc.parser({}, ''))
  		.pipe(jsdoc.generator('./release/doc2'));
});


gulp.task('start', ['watch'], function() {
	connect.server({
		root: 'release',
		port: 8888,
		livereload: true
	});

});

gulp.task('reload-release', function() {
	connect.reload();
});

// runs all unit tests
gulp.task('test', function() {
	return gulp.src(sourcePaths.testFiles, {read: false})
			.pipe(mocha({reporter: 'nyan'}));
});

// generates code coverage report
gulp.task('cover', function(cb) {
    gulp.src(sourcePaths.implFiles)
      .pipe(istanbul())
      .on('finish', function() {
        gulp.src(sourcePaths.testFiles)
          .pipe(mocha())
          .pipe(istanbul.writeReports())
          .on('end', cb);
      });
});

gulp.task('coveralls', function() {
    gulp.src('sourcePaths.coverCov')
     .pipe(coveralls());
});

// runs performance test suite
gulp.task('perf', function() {

});

gulp.task('docs', ['docs:md-to-html', 'docs:md-to-man', 'docs:jsdoc-to-html'], function() {

});

gulp.task('watch', function() {
	gulp.watch(sourcePaths.md, ['docs:md-to-html', 'reload-release']);
	gulp.watch(sourcePaths.man, ['docs:md-to-man', 'reload-release']);
	gulp.watch(sourcePaths.jsFiles, ['docs:jsdoc-to-html', 'reload-release']);
});

gulp.task('default', ['docs:md-to-html', 'docs:md-to-man', 'docs:jsdoc-to-html', 'test', 'cover', 'perf', 'start', 'watch']);
