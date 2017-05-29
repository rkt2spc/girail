//========================================================================================================
// External Dependencies
var async = require('async');
var google = require('googleapis');

//========================================================================================================
// Lib Dependencies
var configsAdapter = require('../configs-adapter');
var utils = require('../utilities');

//========================================================================================================
// Errors Definitions
var LogicError = require('../errors').LogicError;

//========================================================================================================
// Configurations
var gmailSettings = configsAdapter.loadGmailSettings();
var googleCredentials = configsAdapter.loadGoogleCredentials();

//========================================================================================================
// Gmail Service
function Mailbox(settings) {

    var tokens = JSON.parse(Buffer.from(settings.tokens, 'base64').toString('utf8'));

    //-------------------------
    var oauth2Client = new google.auth.OAuth2(
        googleCredentials.installed.client_id,
        googleCredentials.installed.client_secret,
        googleCredentials.installed.redirect_uris[0]
    );
    oauth2Client.setCredentials(tokens);

    //-------------------------
    Object.assign(this, settings);
    this.gmailService = google.gmail({
        version: 'v1',
        auth: oauth2Client
    });
}

//========================================================================================================
// Retrieve all unprocessed messages
Mailbox.prototype.retrieveUnprocessedMessages = function (callback) {

    var self = this;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        self.gmailService.users.messages.list({
            userId: 'me',
            labelIds: [self.labels['Unprocessed']]
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
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark messages enqueued
Mailbox.prototype.markMessageEnqueued = function (message, callback) {

    var self = this;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        if (!message || !message.id)
            return reject(new LogicError({
                code: 'LE001',
                message: 'Gmail#markMessageEnqueued: Invoked with invalid parameter',
                data: { message: message }
            }));

        //-------------------------
        self.gmailService.users.messages.modify(
            // Modify params
            {
                userId: 'me',
                id: message.id,
                resource: {
                    addLabelIds: [self.labels['Enqueued']],
                    removeLabelIds: [self.labels['Unprocessed']]
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
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark messages enqueued
Mailbox.prototype.markMessageProcessed = function (message, callback) {

    var self = this;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        if (!message || !message.id)
            return reject(new LogicError({
                code: 'LE002',
                message: 'Gmail#markMessageProcessed: Invoked with invalid parameter',
                data: { message: message }
            }));

        //-------------------------
        self.gmailService.users.messages.modify(
            // Modify params
            {
                userId: 'me',
                id: message.id,
                resource: {
                    addLabelIds: [self.labels['Processed']],
                    removeLabelIds: [self.labels['Enqueued']]
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
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark messages Unprocessible
Mailbox.prototype.markMessageUnprocessible = function (message, callback) {

    var self = this;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        if (!message || !message.id)
            return reject(new LogicError({
                code: 'LE003',
                message: 'Gmail#markMessageUnprocessible: Invoked with invalid parameter',
                data: { message: message }
            }));

        //-------------------------
        self.gmailService.users.messages.modify(
            // Modify params
            {
                userId: 'me',
                id: message.id,
                resource: {
                    addLabelIds: [self.labels['Unprocessible']],
                    removeLabelIds: [self.labels['Enqueued'], self.labels['Unprocessed']]
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
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Get detailed Gmail Message
Mailbox.prototype.getMessage = function (messageId, callback) {

    var gmailService = this.gmailService;
    var settings = this.settings;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        if (!messageId)
            return reject(new LogicError({
                code: 'LE004',
                message: 'Gmail#getMessage: Invoked with invalid parameter',
                data: { messageId: messageId }
            }));

        //-------------------------
        gmailService.users.messages.get(
            // get params
            {
                userId: 'me',
                id: messageId,
                format: 'full',
                metadataHeaders: gmailSettings.METADATA_HEADERS
            },
            // Callback
            (err, message) => {
                if (err) return reject(err);
                fulfill(message);
            }
        );
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Get detailed Gmail Message
Mailbox.prototype.getThread = function (threadId, callback) {

    var gmailService = this.gmailService;
    var settings = this.settings;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        if (!threadId)
            return reject(new LogicError({
                code: 'LE005',
                message: 'Gmail#getThread: Invoked with invalid parameter',
                data: { threadId: threadId }
            }));

        //-------------------------
        gmailService.users.threads.get(
            // get params
            {
                userId: 'me',
                id: threadId,
                format: 'minimal',
                fields: 'messages(id)'
            },
            // Callback
            (err, thread) => {
                if (err) return reject(err);
                fulfill(thread);
            }
        );
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Get a message attachment
Mailbox.prototype.getAttachment = function (params, callback) {

    var gmailService = this.gmailService;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        if (!params || !params.messageId || !params.attachmentId)
            return reject(new LogicError({
                code: 'LE006',
                message: 'Gmail#getAttachment: Invoked with invalid parameter',
                data: { params: params }
            }));

        //-------------------------
        gmailService.users.messages.attachments.get({
            userId: 'me',
            messageId: params.messageId,
            id: params.attachmentId
        }, (err, response) => {

            if (err) return reject(err);

            var data = Buffer.from(response.data, 'base64');
            fulfill(data);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Send message
Mailbox.prototype.sendMessage = function(params, callback) {

    var gmailService = this.gmailService;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        var message = {

        }

        //-------------------------
        gmailService.users.messages.send({
            userId: 'me',
            resource: {
                raw: 'hehe'
            }
        })

    });
};

//========================================================================================================
// Exports
module.exports = Mailbox;
