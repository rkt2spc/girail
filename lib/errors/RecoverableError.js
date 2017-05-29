//------------------------------------------------------------------------
const utils = require('../utilities');

//------------------------------------------------------------------------
function RecoverableError(params) {
  this.name = 'RecoverableError';
  this.code = params.code || -1;
  this.message = params.message || '(No message)';
  this.info = params.info || undefined;

  if (params.src) {
    this.src = {
      name    : params.src.name,
      message : utils.shortenString(params.src.message),
    };
  }
}

RecoverableError.prototype = Object.create(Error.prototype);
RecoverableError.prototype.constructor = RecoverableError;

//------------------------------------------------------------------------
module.exports = RecoverableError;
