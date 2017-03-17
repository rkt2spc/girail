module.exports = {
    
    log: function (logTitle) {
        return function (logData) {
            console.log(logTitle + ':', logData);
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