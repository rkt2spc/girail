//------------------------------------------------------------------------
const utils = require('../utilities');

//------------------------------------------------------------------------
function UnrecoverableError(params) {

  this.name = 'UnrecoverableError';

  this.code = params.code || -1;
  this.message = params.message || 'Default Message';
  this.info = params.data || undefined;

  if (params.src) {
    this.src = {
      name: params.src.name,
      message: utils.shortenString(params.src.message)
    };
  }
}

UnrecoverableError.prototype = Object.create(Error.prototype);
UnrecoverableError.prototype.constructor = UnrecoverableError;

//------------------------------------------------------------------------
module.exports = UnrecoverableError;
