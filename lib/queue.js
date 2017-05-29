//= =======================================================================================================
// Lib Dependencies
const configsAdapter = require('./configs-adapter');
const utils = require('./utilities');

//= =======================================================================================================
// Errors Definitions

//= =======================================================================================================
// Configurations
const awsSettings = configsAdapter.loadAwsSettings();

//= =======================================================================================================
// AWS Service
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({
  region     : awsSettings.region,
  apiVersion : awsSettings.api_version,
});

//= =======================================================================================================
// Basic internal exposes
exports.sqsService = sqs;
exports.url = awsSettings.queue_url;

//= =======================================================================================================
// Enqueue a message
exports.sendMessage = function (message, callback) {
    //-------------------------
  const promise = new Promise((fulfill, reject) => {
    sqs.sendMessage({
      MessageBody : message,
      QueueUrl    : awsSettings.queue_url,
    }, (err, data) => {
      if (err) return reject(err);
      return fulfill(data);
    });
  });

    //-------------------------
  return utils.wrapAPI(promise, callback);
};

//= =======================================================================================================
// Terminate Message Visibility Timeout
exports.terminateMessageVisibilityTimeout = function (messageHandle, callback) {
    //-------------------------
  const promise = new Promise((fulfill, reject) => {
    sqs.changeMessageVisibility({
      QueueUrl          : awsSettings.queue_url,
      ReceiptHandle     : messageHandle,
      VisibilityTimeout : 0,
    }, (err, data) => {
      if (err) return reject(err);
      return fulfill(data);
    });
  });

    //-------------------------
  return utils.wrapAPI(promise, callback);
};
