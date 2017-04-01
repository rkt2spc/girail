var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

gulp.task('consume', function () {

    var nodemon = plugins.nodemon({
        script: 'consumer.js',
        watch: ['./configs', './credentials'],
        // ignore: ['build', 'src', 'gulpfile.js'],
        ext: 'yaml',
        // env: { 'NODE_ENV': 'development' }
    });

    nodemon.on('crash', function () {
        var delay = 3;
        nodemon.emit('restart', delay);
    });

    return nodemon;
});