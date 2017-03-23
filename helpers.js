function pad(value, length) {
    return (value.toString().length < length) ? pad(value + ' ', length) : value;
}

module.exports = {
    
    log: function (logMessage) {
        return function (logData) {
            console.log(logMessage);
            return logData;
        };
    },

    logStatus: function (job, status) {
        return function(logData) {
            console.log(pad(job, 30), status);        
            return logData;
        };
    },

    wrapAPI: function (promise, callback) {

        if (callback && (typeof callback === 'function')) {
            // Using callback API
            promise
                .then((result) => callback(null, result))
                .catch((err) => callback(err));
        }
        else // Using Promise API
            return promise;
    }
};