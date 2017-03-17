//========================================================================================================
var google = require('googleapis');
var async = require('async');
var lodash = require('lodash');

//========================================================================================================
var database = require('../database');
var helpers = require('../helpers');

//========================================================================================================
const METADATA_HEADERS = ['In-Reply-To', 'References', 'From', 'Date', 'Message-ID', 'Subject', 'To'];

//========================================================================================================
// Constructor
var GMail = function (authClient) {
    this.GMailService = google.gmail({
        version: 'v1',
        auth: authClient
    });
    this.name = this.GMailService;
};

//========================================================================================================
// Register a Watch
GMail.prototype.registerWatch = function (params, callback) {
    var gmail = this.GMailService;

    //-------------------------        
    var promise = new Promise((fulfill, reject) => {
        gmail.users.watch(params, (err, response) => {
            if (err) return reject(err);
            fulfill(response);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Get Added Messages since historyId
GMail.prototype.getAddedMessages = function (historyId, callback) {
    console.log("GMailProcessor:GetAddedMessages");
    var gmailService = this.GMailService;

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {
                
        if (!historyId || historyId <= 0)
            return reject(new Error("Invalid historyId to get added messages"));

        gmailService.users.history.list({
            userId: 'me',
            historyTypes: "messageAdded",
            startHistoryId: historyId
        },
            function (err, response) {
                if (err) return reject(err);
                if (!response.history || response.history.length === 0)
                    return reject(new Error('False trigger, no events happened since last historyId'));

                var histories = response.history.map((h) => h.messagesAdded).filter((v) => v);
                var messages = lodash.uniqBy(lodash.flattenDeep(histories), 'message.id').map((v) => v.message);
                fulfill(messages);
            });
    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
GMail.prototype.filterProcessingMessages = function (messages, callback) {
    console.log("GMailProcessor:FilterProcessingMessages");                     
    
    //-------------------------    
    var promise = new Promise((fulfill, reject) => {
        if (!messages || messages.length === 0)
            return reject(new Error('No messages to filter'));

        async.reduce(messages, [], (memo, message, cb) => {
            database.markMessageProcessing(message, (err) => {
                if (err && err.code !== 11000) return cb(err); // System Error
                
                if (!err)
                    memo.push(message);
                else console.log('Filter bug:', err);
                    
                cb(null, memo);
            });
        }, (err, filteredMessages) => {
            if (err) return reject(err);
            fulfill(filteredMessages);
        });
    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Get Detailed Messages from metadata
GMail.prototype.getDetailedMessages = function (messages, callback) {
    console.log("GMailProcessor:GetDetailedMessages");
    var self = this;                       
    var gmailService = self.GMailService;

    //------------------------- 
    var promise = new Promise((fulfill, reject) => {

        if (!messages || messages.length === 0)
            return reject(new Error('No messages to get detail'));

        async.map(messages, (message, cb) => {

            gmailService.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full',
                metadataHeaders: METADATA_HEADERS
            }, (err, detailedMessage) => {
                if (err) return cb(err);
                cb(null, detailedMessage);
            });

        }, (err, detailedMessages) => {
            if (err) return reject(err);
            fulfill(detailedMessages);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Transform messages to cleaner format, ready for Jira
GMail.prototype.formatMessages = function (messages, callback) {
    
    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        if (!messages || messages.length === 0)
            return reject(new Error('No messages to format'));
        
        var transformedMessages = messages.map((message) => {
            var transformedMessage = {
                id: message.id,
                threadId: message.threadId,
                labelIds: message.labelIds,
                historyId: message.historyId,
                type: 'standard',
                subject: '',
                content: '',
                attachments: []
            };

            var headers = lodash.chain(message.payload.headers)
                                .keyBy('name')
                                .mapValues('value')
                                .value();

            transformedMessage.emailId = headers['Message-ID'];
            if (headers['In-Reply-To'] || headers['References']) {
                transformedMessage.type = 'reply';
                transformedMessage.directReply = headers['In-Reply-To'];
                transformedMessage.rootReply = headers['References'].split(' ')[0];
            }
            else
                transformedMessage.subject = headers['Subject'];

            if (!message.payload.mimeType.includes('multipart')) {
                transformedMessage.content = message.payload.body;
                return transformedMessage;
            }
            
            // Get parts and flatten 2 level deep
            var parts = message.payload.parts;
            parts = lodash.flatMapDeep(parts, p => p.mimeType.includes('multipart') ? p.parts : p);
            parts = lodash.flatMapDeep(parts, p => p.mimeType.includes('multipart') ? p.parts : p);

            // Get Message content and attachments
            transformedMessage.content = "";
            transformedMessage.attachments = [];
            parts.forEach((p) => {
                if (!p.body.attachmentId && p.body.data && p.mimeType === 'text/plain')
                    transformedMessage.content += Buffer.from(p.body.data, 'base64').toString();
                else if (p.filename && p.body.attachmentId) {
                    transformedMessage.attachments.push({
                        mimeType: p.mimeType,
                        filename: p.filename,
                        id: p.body.attachmentId
                    });
                }
            });

            return transformedMessage;
        });

        fulfill(transformedMessages);
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
module.exports = GMail;