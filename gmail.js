//========================================================================================================
// Dependencies
var async = require('async');
var google = require('googleapis');
var helpers = require('./helpers');

//========================================================================================================
const METADATA_HEADERS = ['In-Reply-To', 'References', 'From', 'Date', 'Message-ID', 'Subject', 'To'];
const LABELS = {
    'Unprocessed': 'Label_4',
    'Enqueued': 'Label_5',
    'Unprocessible': 'Label_6',
    'Processed': 'Label_7'
};

//========================================================================================================
// Credentials
var oauth2Credentials = require('./credentials/oauth-secret.json').installed;
var oauth2Tokens = require('./credentials/access-token.json');

//========================================================================================================
// OAuth2 Client
var oauth2Client = new google.auth.OAuth2(
    oauth2Credentials.client_id,
    oauth2Credentials.client_secret,
    oauth2Credentials.redirect_uris[0]
);
oauth2Client.setCredentials(oauth2Tokens);

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
            labelIds: [LABELS['Unprocessed']]
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
                    addLabelIds: [LABELS['Enqueued']],
                    removeLabelIds: [LABELS['Unprocessed']]
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
                addLabelIds: [LABELS['Unprocessible']],
                removeLabelIds: [LABELS['Unprocessed']]
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
                metadataHeaders: METADATA_HEADERS
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
};