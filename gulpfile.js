var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

gulp.task('consume', function () {

    var nodemon = plugins.nodemon({
        script: 'consumer.js',
        watch: ['./configs', './credentials'],
        ext: 'yaml json',
    });

    return nodemon;
});

gulp.task('cron', function () {

    var nodemon = plugins.nodemon({
        script: 'cron.js',
        watch: ['./configs', './credentials'],
        ext: 'yaml json',
    });

    return nodemon;
});