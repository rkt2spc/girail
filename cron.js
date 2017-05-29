//------------------------------------------------------------------------------
const async = require('async');
const cronTask = require('./cron-task');
let stop = false;

//------------------------------------------------------------------------------
async.forever((next) => {
  if (stop) return next('Stopped');

  // After a Task done, wait 60 sec before doing next task
  cronTask(() => setTimeout(() => next(), 30000));
}, (err) => process.kill(process.pid, 'SIGUSR2'));

//------------------------------------------------------------------------------
process.once('SIGUSR2', () => {
  stop = true;
});
