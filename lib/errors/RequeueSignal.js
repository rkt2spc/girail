//------------------------------------------------------------------------
function RequeueSignal(params) {

    this.name = 'RequeueSignal';    
    
    this.code = params.code || -1;
    this.message = params.message || '(No message)';
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

RequeueSignal.prototype = Object.create(Error.prototype);
RequeueSignal.prototype.constructor = RequeueSignal;

//------------------------------------------------------------------------
module.exports = RequeueSignal;