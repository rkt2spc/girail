//------------------------------------------------------------------------------
// External Dependencies
const lodash = require('lodash');

//------------------------------------------------------------------------------
// Lib Dependencies
const logger = require('./logger').consumerLogger;

//------------------------------------------------------------------------------
// Configurations

//------------------------------------------------------------------------------
// Promise Log
exports.log = (logMessage) => {
  return (logData) => {
    logger.info(logMessage);
    return logData;
  };
};

//------------------------------------------------------------------------------
// Promise Log Status
exports.logStatus = (task, status) => {
  return (logData) => {
    logger.info(lodash.padEnd(task, 30), status);
    return logData;
  };
};

//------------------------------------------------------------------------------
// Wrap API for versaility between promise and callback
exports.wrapAPI = (promise, callback) => {
  if (callback && (typeof callback === 'function')) promise.then((result) => callback(null, result)).catch((err) => callback(err));
  else return promise;
};

//------------------------------------------------------------------------------
// Shorten string (often done for log message readability)
exports.shortenString = (str, maxlen = 255) => {
  if (!str) return str;
  if (str.length <= maxlen) return str;

  const remainingLength = str.length - maxlen;
  const shortenedStr = str.substr(0, maxlen);
  return shortenedStr + `... (remaining ${remainingLength} characters)`;
};


//------------------------------------------------------------------------------
// Extract an array of emails from given string
exports.extractEmails = (emailsStr) => {
  return lodash
    .chain(emailsStr)
    .split(/ *, */g)
    .map(e => e.replace(/[<>()'"]/g, ''))
    .map(e => e.split(/\s+/g))
    .flatten()
    .map(e => e.match(/^.+@.+$/g))
    .flatten()
    .compact()
    .uniq()
    .value();
};
