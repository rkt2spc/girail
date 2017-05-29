//------------------------------------------------------------------------
function LogicError(params) {
  this.name = 'LogicError';
  this.code = params.code || -1;
  this.message = params.message || '(Error without message)';
  this.info = params.info;
  this.stack = (new Error()).stack;
}

LogicError.prototype = Object.create(Error.prototype);
LogicError.prototype.constructor = LogicError;

//------------------------------------------------------------------------
module.exports = LogicError;
