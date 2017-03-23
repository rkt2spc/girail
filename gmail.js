//========================================================================================================
// Dependencies
var async = require('async');
var google = require('googleapis');
var helpers = require('./helpers');

//========================================================================================================
// Configurations
var gmailConfigs = require('./configs/gmail-conf.json');

//========================================================================================================
// Credentials
var googleCredentials = require('./credentials/google-secret.json').installed;
var googleTokens = require('./credentials/google-token.json');

//========================================================================================================
// OAuth2 Client
var oauth2Client = new google.auth.OAuth2(
    googleCredentials.client_id,
    googleCredentials.client_secret,
    googleCredentials.redirect_uris[0]
);
oauth2Client.setCredentials(googleTokens);

//========================================================================================================
// Gmail Service
var gmailService = google.gmail({
    version: 'v1',
    auth: oauth2Client
});

//========================================================================================================
// Retrieve all unprocessed messages
exports.retrieveUnprocessedMessages = function (callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        gmailService.users.messages.list({
            userId: 'me',
            labelIds: [gmailConfigs.labels['Unprocessed']]
        }, (err, response) => {
            if (err) return reject(err);

            // No new messages
            if (!response.messages || response.messages.length <= 0)
                return fulfill([]);

            // Have new messages
            fulfill(response.messages);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark messages enqueued
exports.markMessageEnqueued = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        // if (!message || !message.id)

        //-------------------------
        gmailService.users.messages.modify(
            // Modify params
            {
                userId: 'me',
                id: message.id,
                resource: {
                    addLabelIds: [gmailConfigs.labels['Enqueued']],
                    removeLabelIds: [gmailConfigs.labels['Unprocessed']]
                }
            },
            // Callback
            (err) => {
                if (err) return reject(err);
                fulfill();
            }
        );
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark messages Unprocessible
exports.markMessageUnprocessible = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        // if (!message || !message.id)

        //-------------------------
        gmailService.users.messages.modify(
            // Modify params
            {
                userId: 'me',
                id: message.id,
                resource: {
                    addLabelIds: [gmailConfigs.labels['Unprocessible']],
                    removeLabelIds: [gmailConfigs.labels['Enqueued'], gmailConfigs.labels['Unprocessed']]
                }
            },
            // Callback
            (err) => {
                if (err) return reject(err);
                fulfill();
            }
        );
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark messages Unprocessible
exports.markMessageProcessed = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        // if (!message || !message.id)

        //-------------------------
        gmailService.users.messages.modify(
            // Modify params
            {
                userId: 'me',
                id: message.id,
                resource: {
                    addLabelIds: [gmailConfigs.labels['Processed']],
                    removeLabelIds: [gmailConfigs.labels['Unprocessed'], gmailConfigs.labels['Enqueued']]
                }
            },
            // Callback
            (err) => {
                if (err) return reject(err);
                fulfill();
            }
        );
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
exports.getMessage = function (messageId, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        // if (!message || !message.id)

        //-------------------------
        gmailService.users.messages.get(
            // get params
            {
                userId: 'me',
                id: messageId,
                format: 'full',
                metadataHeaders: gmailConfigs.metadata_headers
            },
            // Callback
            (err, message) => {
                if (err) return reject(err);
                fulfill(message);
            }
        );
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
exports.getAttachment = function (params, callback) {
    var messageId = params.messageId;
    var attachmentId = params.attachmentId;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        gmailService.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: attachmentId
        }, (err, response) => {

            if (err) return reject(err);

            var data = Buffer.from(response.data, 'base64');
            fulfill(data);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};