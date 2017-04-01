var async = require('async');
var cronTask = require('./cron-task');

async.forever((next) => {
    // After a Task done, wait 60 sec before doing next task
    cronTask(() => setTimeout(() => next(), 30000));
}, (err) => {
    console.log('Bùm chết cron rồi ba ơi');
});