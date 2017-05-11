//------------------------------------------------------------------------
function DropSignal(params) {

    this.name = 'DropSignal';    
    
    this.code = params.code || -1;
    this.message = params.message || '(No message)';
    this.data = params.data || undefined;

    if (params.src && params.src instanceof Error) {
        this.srcMessage = params.src.message;
        this.stack = params.src.stack;
    } else {
        this.srcMessage = params.src ? (params.src.message || '') : '';
        this.stack = (new Error()).stack;
    }
}

DropSignal.prototype = Object.create(Error.prototype);
DropSignal.prototype.constructor = DropSignal;

//------------------------------------------------------------------------
module.exports = DropSignal;