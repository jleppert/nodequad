var gulp 	  = require('gulp'),
	util      = require('util'),
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
    shell     = require('gulp-shell'),
    through   = require('through'),
    notify    = require('gulp-notify'),
	PACKAGE   = require('./package.json');

var sourcePaths = {
	js: ['lib', 'examples', 'tests', 'bin', 'perf'],
	ignoreJs: ['drivers/index.js', 'protocols/index.js'],
	implFiles: ['index.js', 'lib/**/*.js'],
    jsFiles: ['lib/**/*.js', 'examples/**/*.js', 'tests/**/*.js', 'bin/**/*.js'],
	testFiles: ['tests/**/*.js'],
	md: ['README.md', 'CHANGELOG.md'],
	man: ['man/NODEQUAD-CLI.md'],
	docTpl: 'etc/docs.jade',
	docMd: 'etc/API.md',
    coverCov: 'coverage/lcov.info'
};

var destPaths = {
	md:     'release/doc',
	man:    'release/man',
	js:     'release/doc',
	cover:  'release/coverage',
	testMd: 'release/test/index.md',
	tests:   'release/test'
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

// creates unit test HTML documentation
gulp.task('docs:test', shell.task([
  ['mocha', '--reporter markdown', sourcePaths.testFiles, '>', destPaths.testMd].join(' '),
  ['generate-md', '--layout mixu-gray', '--input', destPaths.testMd, '--output', destPaths.tests, '--highlight mds-hljs'].join(' ')
]));

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
// TODO: figure out why watch won't work with this
gulp.task('test', function(cb) {
	return gulp.src(sourcePaths.testFiles, {read: false}).pipe(mocha());
});

// generates code coverage report
gulp.task('cover', function(cb) {
    gulp.src(sourcePaths.implFiles)
      .pipe(istanbul())
      .on('finish', function() {
        gulp.src(sourcePaths.testFiles)
          .pipe(mocha())
          .pipe(istanbul.writeReports({
             dir: destPaths.cover,
          	 reporters: [ 'lcov', 'json', 'text', 'text-summary' ]
            })).on('end', function() {
            	var stats    = istanbul.summarizeCoverage();
            	var output = [
            				['Lines:', stats.lines.pct + '%', ['[', stats.lines.covered, '/', stats.lines.total, ']'].join('')].join(' '),
            				['Statements:', stats.statements.pct + '%', ['[', stats.statements.covered, '/', stats.statements.total, ']'].join('')].join(' '),
            				['Functions:', stats.functions.pct + '%', ['[', stats.functions.covered, '/', stats.functions.total, ']'].join('')].join(' '),
            				['Branches:', stats.branches.pct + '%', ['[', stats.branches.covered, '/', stats.branches.total, ']'].join('')].join(' ')
            			].join("\n");
            	notify({
            		title: 'Code Coverage: ' + ((stats.lines.pct + stats.statements.pct + stats.functions.pct + stats.branches.pct) / 4) + '%',
            		message: output
            	}).write('');
          	 cb();
          });
      });
});

gulp.task('coveralls', function() {
    gulp.src('sourcePaths.coverCov').pipe(coveralls());
});

gulp.task('docs', ['docs:md-to-html', 'docs:md-to-man', 'docs:jsdoc-to-html'], function() {});

gulp.task('watch', function() {
	gulp.watch(sourcePaths.testFiles, ['test', 'cover', 'docs:test']);
	gulp.watch(sourcePaths.md, ['docs:md-to-html', 'reload-release']);
	gulp.watch(sourcePaths.man, ['docs:md-to-man', 'reload-release']);
	gulp.watch(sourcePaths.jsFiles, ['docs:jsdoc-to-html', 'reload-release']);
});

gulp.task('default', ['docs:md-to-html', 'docs:md-to-man', 'docs:jsdoc-to-html', 'test', 'cover', 'start']);