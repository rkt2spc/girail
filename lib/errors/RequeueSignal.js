//------------------------------------------------------------------------
const utils = require('../utilities');

//------------------------------------------------------------------------
function RequeueSignal(params) {

  this.name = 'RequeueSignal';

  this.code = params.code || -1;
  this.message = params.message || '(No message)';
  this.info = params.data || undefined;

  if (params.src) {
    this.src = {
      name: params.src.name,
      message: utils.shortenString(params.src.message)
    };
  }
}

RequeueSignal.prototype = Object.create(Error.prototype);
RequeueSignal.prototype.constructor = RequeueSignal;

//------------------------------------------------------------------------
module.exports = RequeueSignal;
