function pad(value, length) {
    return (value.toString().length < length) ? pad(value + ' ', length) : value;
}

module.exports = {
    
    log: function (logTitle) {
        return function (logData) {
            console.log(logTitle + ':', logData);
            return logData;
        };
    },

    logStatus: function (job, status) {
        console.log(pad(job, 30), status);
        return (logData) => logData;
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