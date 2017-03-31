//------------------------------------------------------------------------
function RequeueSignal(params) {

    this.name = 'RequeueSignal';    
    
    this.code = params.code || -1;
    this.message = params.message || '(No message)';

    this.src = params.src;
    if (params.src && params.src instanceof Error)
        this.stack = params.src.stack;
    else
        this.stack = (new Error()).stack;
}

RequeueSignal.prototype = Object.create(Error.prototype);
RequeueSignal.prototype.constructor = RequeueSignal;

//------------------------------------------------------------------------
module.exports = RequeueSignal;