//------------------------------------------------------------------------
const utils = require('../utilities');

//------------------------------------------------------------------------
function DropSignal(params) {

  this.name = 'DropSignal';

  this.code = params.code || -1;
  this.message = utils.shortenString(params.message) || '(No message)';
  this.info = params.info || undefined;

  if (params.src) {
    this.src = {
      name: params.src.name,
      message: utils.shortenString(params.src.message)
    };
  }
}

DropSignal.prototype = Object.create(Error.prototype);
DropSignal.prototype.constructor = DropSignal;

//------------------------------------------------------------------------
module.exports = DropSignal;
