//------------------------------------------------------------------------
function UnrecoverableError(params) {

    this.name = 'UnrecoverableError';    
    
    this.code = params.code || -1;
    this.message = params.message || 'Default Message';
    this.recoveryData = params.recoveryData || null;

    this.src = params.src;
    if (params.src && params.src instanceof Error) {
        this.srcMessage = params.src.message;
        this.stack = params.src.stack;
    }
    else
        this.stack = (new Error()).stack;
}

UnrecoverableError.prototype = Object.create(Error.prototype);
UnrecoverableError.prototype.constructor = UnrecoverableError;

//------------------------------------------------------------------------
module.exports = UnrecoverableError;