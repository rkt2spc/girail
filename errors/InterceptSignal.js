//------------------------------------------------------------------------
function InterceptSignal(params) {

    this.name = 'InterceptError';    
    
    this.code = params.code || -1;
    this.message = params.message || '(No message)';

    this.src = params.src;
    if (params.src && params.src instanceof Error)
        this.stack = params.src.stack;
    else
        this.stack = (new Error()).stack;
}

InterceptSignal.prototype = Object.create(Error.prototype);
InterceptSignal.prototype.constructor = InterceptSignal;

//------------------------------------------------------------------------
module.exports = InterceptSignal;