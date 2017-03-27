//========================================================================================================
// Lib Dependencies
var configsAdapter  = require('./configs-adapter');
var utils           = require('./utilities');

//========================================================================================================
// Errors Definitions

//========================================================================================================
// Configurations
var awsSettings = configsAdapter.loadAwsSettings();

//========================================================================================================
// AWS Service
var AWS = require('aws-sdk');
var sqs = new AWS.SQS({
    region: awsSettings.region,
    apiVersion: awsSettings.api_version
});

//========================================================================================================
// Basic internal exposes
exports.sqsService  = sqs;
exports.url         = awsSettings.queue_url;

//========================================================================================================
// Enqueue a message
exports.sendMessage = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        sqs.sendMessage({
            MessageBody: message,
            QueueUrl: awsSettings.queue_url
        }, (err, data) => {

            if (err) return reject(err);
            return fulfill(data);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};