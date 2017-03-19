function CoreError(params) {

    this.code = params.code || '0';
    this.name = params.name || 'Core Error';
    this.message = params.message || 'Default Message';
    this.stack = (new Error()).stack;
}

MyError.prototype = Object.create(Error.prototype);
MyError.prototype.constructor = MyError;


module.exports = MyError;