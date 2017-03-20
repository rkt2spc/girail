function AppError(params) {

    this.code = params.code || '0';
    this.name = params.name || 'App Error';
    this.message = params.message || 'Default Message';
    this.value = params.value || undefined;
    this.location = params.location || undefined;
    this.type = params.type || 'unhandled';
    this.stack = (new Error()).stack;
}

AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

module.exports = AppError;