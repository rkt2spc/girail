//------------------------------------------------------------------------------
// External Dependencies
const lodash = require('lodash');

//------------------------------------------------------------------------------
// Lib Dependencies
const logger = require('./logger').consumerLogger;

//------------------------------------------------------------------------------
// Configurations
function padSpacesRight(value, length) {
  return (value.toString().length < length)
    ? padSpacesRight(value + ' ', length)
    : value;
}
//------------------------------------------------------------------------------
// Exports
module.exports = {

  // padSpaceRight
  padSpacesRight: padSpacesRight,

  // Promise based utils
  log: function (logMessage) {
    return function (logData) {
      logger.info(logMessage);
      return logData;
    };
  },
  logStatus: function (task, status) {
    return function (logData) {
      logger.info(padSpacesRight(task, 30), status);
      return logData;
    };
  },
  wrapAPI: function (promise, callback) {
    if (callback && (typeof callback === 'function')) {
      // Using callback API
      promise.then((result) => callback(null, result)).catch((err) => callback(err));
    } else // Using Promise API
      { return promise; }
  },
  shortenString: function (str, maxlen = 255) {
    if (!str) { return str; }
    if (str.length <= maxlen) { return str; }

    const remainingLength = str.length - maxlen;
    const shortenedStr = str.substr(0, maxlen);
    return shortenedStr + `... (remaining ${remainingLength} characters)`;
  },
  extractEmails: function (emailsStr) {
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
  },
};
