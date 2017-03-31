//------------------------------------------------------------------------
function RecoverableError(params) {

    this.name = 'RecoverableError';    
    
    this.code = params.code || -1;
    this.message = params.message || '(No message)';

    this.src = params.src;
    if (params.src && params.src instanceof Error)
        this.stack = params.src.stack;
    else
        this.stack = (new Error()).stack;
}

RecoverableError.prototype = Object.create(Error.prototype);
RecoverableError.prototype.constructor = RecoverableError;

//------------------------------------------------------------------------
module.exports = RecoverableError;