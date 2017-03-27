//========================================================================================================
// External Dependencies

//========================================================================================================
// Lib Dependencies

//========================================================================================================
// Configurations


//========================================================================================================
function padSpacesRight(value, length) {
    return (value.toString().length < length) ? padSpacesRight(value + ' ', length) : value;
}

//========================================================================================================
// Exports
module.exports = {
    
    // Promise based utils
    log: function (logMessage) {
        return function (logData) {
            console.log(logMessage);
            return logData;
        };
    },
    logStatus: function (task, status) {
        return function(logData) {
            console.log(padSpacesRight(task, 30), status);        
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
    },
};