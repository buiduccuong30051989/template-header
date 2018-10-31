'use strict';

var gulp = require('gulp');
var plumber = require('gulp-plumber');
var gutil = require('gulp-util');
var $ = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();
var del = require('del');
var fs = require('fs');
var pug = require('pug');
var autoprefixer = require('autoprefixer');
var bower = require('gulp-bower');

var header = require('gulp-header');

var pkg = require('./package.json');
var banner = [
              '',
              '',
              '/************************************************',
              '',
              '',
              ' * <%= pkg.name %> : <%= pkg.description %>',
              ' * @Version        : v<%= pkg.version %>',
              ' * @Link           : <%= pkg.homepage %>',
              ' * @License        : <%= pkg.license %>',
              ' * @Author         : <%= pkg.author %>',
              '',
              '',
              ' ***********************************************/',
              '',
              '',
              ''].join('\n');

gulp.src(source + 'js/*.js')
  .pipe(header(banner, { pkg : pkg } ))
  .pipe(gulp.dest('./dest/'))

gulp.task('bower', function() {
  return bower().pipe(gulp.dest(dest +'lib/'))
});

var
  source = 'source/',
  dest = 'dest/',
  lib = 'bower_components/';


var options = {
  del: [
    'dest'
  ],
  browserSync: {
    open: false,
    server: {
      baseDir: dest
    }
  },
  htmlPrettify: {
    'indent_size': 2,
    'unformatted': ['pre', 'code'],
    'indent_with_tabs': false,
    'preserve_newlines': true,
    'brace_style': 'expand',
    'end_with_newline': true
  },
  include: {
    hardFail: true,
    includePaths: [
      __dirname + "/",
      __dirname + "/bower_components",
      __dirname + "/source/js"
    ]
  },
  pug: {
    pug: pug,
    pretty: '\t'
  }
};

var scss = {
  sassOpts: {
    outputStyle: 'expanded',
    precison: 5,
    errLogToConsole: true,
    includePaths: [
      // lib + 'lightgallery/src/sass'
      './node_modules/',
    ]
  }
};

// fonts
var fonts = {
  in: [
    source + 'fonts/**/*.*',
  ],
  out: dest + 'fonts/'
};

// js
var js = {
  in: [
    // source + 'js/**/*.*',
    // lib + 'jquery/dist/jquery.min.js',
  ],
  out: dest + 'js/'
};

// PostCSS
var processor = [
  autoprefixer({ browsers: ['last 2 versions'] })
];

/**
 * Filter block:
 * Allow add filter
 *
 */
pug.filters.code = function(block) {
  return block
    .replace( /&/g, '&amp;' )
    .replace( /</g, '&lt;' )
    .replace( />/g, '&gt;' )
    .replace( /"/g, '&quot;' );
}

/**
 * Tasks
 * Allow add filter
 *
 */
gulp.task('browser-sync', function() {
  return browserSync.init(options.browserSync);
});

gulp.task('watch', function(cb) {
  $.watch(source + '/sass/**/*.scss', function() {
    gulp.start('compile-styles');
  });

  $.watch(source + '/images/**/*', function() {
    gulp.start('compile-images');
    gulp.start('build-images-name');
  });

  $.watch([
    source + '/*.html',
    source + '/**/*.html'
    ], function() {
    return runSequence('compile-html', browserSync.reload);
  });

  $.watch([
    source + '/*.pug',
    source + '/**/*.pug'
  ], function() {
    return runSequence('compile-pug', browserSync.reload);
  });

  $.watch(source + '/**/*.js', function() {
    return runSequence('compile-js', browserSync.reload);
  });

  $.watch(source + '/modules/*/data/*.json', function() {
    return runSequence('build-html', browserSync.reload);
  });
});

// copy js
gulp.task('js', function() {
  return gulp
    .src(js.in)
    .pipe(gulp.dest(js.out));
});

// copy font
gulp.task('fonts', function() {
  return gulp
    .src(fonts.in)
    .pipe(gulp.dest(fonts.out));
});

// = Delete
gulp.task('cleanup', function(cb) {
  return del(options.del, cb);
});

// = Build Style
gulp.task('compile-styles',['fonts'], function(cb) {
  return gulp.src([
    source + '/sass/*.scss',
    source + '/sass/extention/*.scss',
    '!'+ source +'/sass/_*.scss'
  ])
  .pipe($.sourcemaps.init())
  .pipe($.sass(scss.sassOpts)
    .on('error', $.sass.logError))
  .pipe($.postcss(processor))
  .pipe($.rucksack())
  .pipe($.sourcemaps.write('./', {
    includeContent: false,
    sourceRoot: source + '/sass'
  }))
  .pipe(header(banner, {pkg: pkg}))
  .pipe(gulp.dest(dest + '/css'))
  .pipe(browserSync.stream());
});

// = Build HTML
gulp.task('compile-html', function(cb) {
  return gulp.src(['*.html', '!_*.html'], {cwd: 'source'})
  .pipe($.prettify(options.htmlPrettify))
  .pipe(gulp.dest(dest));
});

// = Build Pug
gulp.task('compile-pug', function(cb) {
  var jsonData = JSON.parse(fs.readFileSync('./tmp/data.json'));
  options.pug.locals = jsonData;

  return gulp.src(['*.pug', 'templates/**/*.pug', '!_*.pug'], {cwd: 'source'})
    .pipe(plumber(function(error){
        console.log("Error happend!", error.message);
        this.emit('end');
    }))
    .pipe($.changed('dest', {extension: '.html'}))
    .pipe($.pugInheritance({
      basedir: "source",
      skip: ['node_modules']
    }))
    .pipe($.pug(options.pug))
    .on('error', function(error) {
      console.error('' + error);
      this.emit('end');
    })
    .pipe($.prettify(options.htmlPrettify))
    .pipe(plumber.stop())
    .pipe(gulp.dest(dest));
});

// = Build HTML
gulp.task('build-html', function(cb) {
  return runSequence(
    'combine-data',
    'compile-pug',
    'compile-html',
    cb
  );
});

// = Build JS
gulp.task('compile-js', function() {
  return gulp.src(["*.js", "!_*.js"], {cwd: 'source/js/**'})
  .pipe($.include(options.include))
  .pipe(header(banner, {pkg: pkg}))
  .pipe(gulp.dest(dest + '/js'));
});

// = Build image
gulp.task('compile-images', function() {
  return gulp.src(source + "/images/**/*.*")
  .pipe(gulp.dest(dest + '/images'));
});

// = Build images name in json file
gulp.task('build-images-name', function() {
  return gulp.src(source + '/images/**/*')
    .pipe(require('gulp-filelist')('filelist.json'))
    .pipe(gulp.dest('tmp'));
});

// = Build DataJson
gulp.task('combine-modules-json', function(cb) {
  return gulp.src(['**/*.json', '!**/_*.json'], {cwd: 'source/modules/*/data'})
    .pipe($.mergeJson('data-json.json'))
    .pipe(gulp.dest('tmp/data'));
});

gulp.task('combine-modules-data', function(cb) {
  return gulp.src('**/*.json', {cwd: 'tmp/data'})
    .pipe($.mergeJson('data.json'))
    .pipe(gulp.dest('tmp'));
});

// Service tasks
gulp.task('combine-data', function(cb) {
  return runSequence(
    [
      'combine-modules-json'
    ],
    'combine-modules-data',
    cb
  );
});

// ================ Development
gulp.task('dev', function(cb) {
  return runSequence(
    'build',
    [
      'browser-sync',
      'build-images-name',
      'watch'
    ],
    cb
    )
});

// ================ Build
gulp.task('build', function(cb) {
  return runSequence(
    'cleanup',
    'bower',
    'compile-images',
    'compile-styles',
    'compile-js',
    'build-html',
    cb
    );
});
