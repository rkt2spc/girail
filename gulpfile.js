//------------------------------------------------------------------------------
const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();

//------------------------------------------------------------------------------
gulp.task('consume', () => {
  const nodemon = plugins.nodemon({
    script : 'consumer.js',
    watch  : ['./configs', './credentials'],
    ext    : 'yaml json',
  });

  return nodemon;
});

//------------------------------------------------------------------------------
gulp.task('cron', () => {
  const nodemon = plugins.nodemon({
    script : 'cron.js',
    watch  : ['./configs', './credentials'],
    ext    : 'yaml json',
  });

  return nodemon;
});
