//------------------------------------------------------------------------
function DropSignal(params) {

    this.name = 'DropSignal';    
    
    this.code = params.code || -1;
    this.message = params.message || '(No message)';

    this.src = params.src;
    if (params.src && params.src instanceof Error)
        this.stack = params.src.stack;
    else
        this.stack = (new Error()).stack;
}

DropSignal.prototype = Object.create(Error.prototype);
DropSignal.prototype.constructor = DropSignal;

//------------------------------------------------------------------------
module.exports = DropSignal;