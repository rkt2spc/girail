//========================================================================================================
// Dependencies
var async = require('async');
var lodash = require('lodash');
var database = require('./database');
var helpers = require('./helpers');
var gmail = require('./gmail');
var jira = require('./jira');

//========================================================================================================
var AppError = require('./errors/AppError');
var errorTemplates = require('./errors/errorTemplates');

//========================================================================================================
exports.getDetailedMessage = function (message, callback) {

    var promise = new Promise((fulfill, reject) => {
        gmail.getMessage(message.id, (err, detailedMessage) => {

            if (err) return reject(err);
            fulfill(detailedMessage);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Format Gmail Messages to easy to work with structure
exports.formatMessage = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------        
        if (!message)
            return reject(new Error(`FormatMessages: Missing Parameters, message was ${message}`));

        //-------------------------
        // Transformed Message Structure
        var transformedMessage = {
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds,
            historyId: message.historyId,
            type: 'standard', // standard || reply
            subject: null, // empty if is a reply-type message 
            content: '',
            attachments: []
        };

        //-------------------------
        // Parse headers      
        var headers = lodash.chain(message.payload.headers)
            .keyBy('name')
            .mapValues('value')
            .value();

        //-------------------------
        // Categorize message     
        if (headers['In-Reply-To'] || headers['References'])
            transformedMessage.type = 'reply';
        else {
            transformedMessage.type = 'standard';
            transformedMessage.subject = headers['Subject'];
        }

        //-------------------------
        // Not a multipart-message        
        if (!message.payload.mimeType.includes('multipart')) {
            transformedMessage.content = Buffer.from(message.payload.body.data, 'base64').toString();
        }
        else {
            //-------------------------
            // Is a multipart-message        
            // Get parts and flatten 2 level deep
            var parts = message.payload.parts;
            parts = lodash.flatMapDeep(parts, p => p.mimeType.includes('multipart') ? p.parts : p);
            parts = lodash.flatMapDeep(parts, p => p.mimeType.includes('multipart') ? p.parts : p);

            //-------------------------        
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
        }

        //-------------------------
        // Normalizing message
        if (transformedMessage.type === 'standard') {
            if (!transformedMessage.subject || transformedMessage.subject.length === 0)
                transformedMessage.subject = '(Untitled)';
        }
        if (transformedMessage.content.length === 0)
            transformedMessage.content = '(no content)';

        //-------------------------
        fulfill(transformedMessage);
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Check message based on company policies
exports.checkMessage = function (message, callback) {

    var promise = Promise.resolve(message);

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Check message extra contents like quotes, signature
exports.removeMessageExtras = function (message, callback) {

    var promise = new Promise((fulfill, reject) => {

        //-------------------------        
        if (message.type !== 'reply')
            return fulfill(message);

        //-------------------------
        // Remove Gmail Extra
        message.content = message.content.replace(/(^\w.+:\r?\n)?(^>.*(\r?\n|$))+/gm, ''); // Reply Quotes
        message.content = message.content.replace(/(\r?\n){2,}-- *\r?\n[^]+$/g, ''); // Signature
        message.content = message.content.replace(/(\r?\n){2,}(-+ *Forwarded message *-+)\r?\n(.+\n)+/gm, ''); // Forward notice
        
        //-------------------------
        // Remove Outlook Reply Quotes

        //-------------------------
        fulfill(message);
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Assign message project based on CC, BCC
exports.assignMessageProject = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        //-------------------------
        message.project = { key: 'SAM' };

        //-------------------------
        // Current passing all messages unfiltered
        fulfill(message);
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Register mapping, make sure no dup passed
exports.registerMapping = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        //-------------------------
        database.createMapping(message, (err, mapping) => {
            if (err && err.code !== 11000)
                reject(err); // Natural disaster

            //-----------
            else if (err && err.code === 11000) {
                reject(err); // Dup message, TO_DO
            }
            //-----------
            else {
                fulfill(message);
            }
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Jira Entity based on message type
exports.createJiraEntity = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        if (message.type === 'standard') {
            jira.createIssue(message, (err, issue) => {
                if (err) return reject(err);

                // Assign Issue                
                message.issueId = issue.id;
                message.issueKey = issue.key;

                fulfill(message);
            });
        }
        else if (message.type === 'reply') {

            // Find Reply Source
            database.findReplySourceMapping(message, (err, mapping) => {
                if (err) return reject(err);

                // Assign Reply Source Issue
                message.issueId = mapping.issueId;
                message.issueKey = mapping.issueKey;

                // Create comment
                jira.createComment(message, (err, comment) => {
                    if (err) return reject(err);
                    message.commentId = comment.id;
                    fulfill(message);
                });
            });
        }
        else
            reject(new Error(`Unrecognized message type: ${message.type}`));
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Update mapping
exports.updateMapping = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        //-------------------------
        database.updateMapping(message, (err, mapping) => {
            if (err) return reject(err);
            fulfill(message);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Upload attachments
exports.uploadAttachments = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        if (!message.attachments || message.attachments.length === 0)
            return fulfill(message);

        //-------------------------
        async.eachSeries(message.attachments, (attachment, cb) => {
            gmail.getAttachment({
                messageId: message.id,
                attachmentId: attachment.id
            }, (err, data) => {

                console.log(`Attachment Buffered ${attachment.filename}`);
                jira.uploadAttachment({
                    issueId: message.issueId,
                    filename: attachment.filename,
                    mimeType: attachment.mimeType,
                    data: data
                }, (err) => {
                    if (err) return cb(err);
                    console.log(`Attachment Uploaded ${attachment.filename}`);
                    cb(null);
                });
            });
        }, (err) => {
            if (err) return reject(err);
            fulfill(message);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark message processed
exports.markMessageProcessed = function (message, callback) {
    
    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        gmail.markMessageProcessed(message, (err) => {
            if (err) return reject(err);
            fulfill(message);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Handle Error
exports.handleError = function (error, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        
    });
    
    //-------------------------
    return helpers.wrapAPI(promise, callback);    
};
