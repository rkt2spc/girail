//------------------------------------------------------------------------
function UnrecoverableError(params) {

    this.name = 'UnrecoverableError';    
    
    this.code = params.code || -1;
    this.message = params.message || 'Default Message';
    this.data = params.data || undefined;

    if (params.src && params.src instanceof Error) {
        this.srcMessage = params.src.message;
        this.srcData = params.src.data;
        this.stack = params.src.stack;
    } else {
        this.srcMessage = params.src ? (params.src.message || '') : '';
        this.stack = (new Error()).stack;
    }
}

UnrecoverableError.prototype = Object.create(Error.prototype);
UnrecoverableError.prototype.constructor = UnrecoverableError;

//------------------------------------------------------------------------
module.exports = UnrecoverableError;