//========================================================================================================
// Dependencies
var helpers = require('./helpers');

//========================================================================================================
// Configurations
var awsConfigs = require('./configs/aws-conf.json');

//========================================================================================================
// AWS Service
var AWS = require('aws-sdk');
var sqs = new AWS.SQS({
    region: awsConfigs.region,
    apiVersion: awsConfigs.api_version
});

//========================================================================================================
// Basic internal expose
exports.sqsService = sqs;
exports.url = awsConfigs.queue_url;

//========================================================================================================
exports.sendMessage =  function(message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        sqs.sendMessage({
            MessageBody: message,
            QueueUrl: awsConfigs.queue_url
        }, (err, data) => {

            if (err) return reject(err);
            return fulfill(data);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};