//------------------------------------------------------------------------
const utils = require('../utilities');

//------------------------------------------------------------------------
function LogicError(params) {
  this.name = 'LogicError';
  this.code = params.code || -1;
  this.message = params.message || '(Error without message)';
  this.info = params.info;
  this.stack = (new Error()).stack;

  if (params.src) {
    this.src = {
      name    : params.src.name,
      message : utils.shortenString(params.src.message),
    };
  }
}

LogicError.prototype = Object.create(Error.prototype);
LogicError.prototype.constructor = LogicError;

//------------------------------------------------------------------------
module.exports = LogicError;
