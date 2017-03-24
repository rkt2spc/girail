//========================================================================================================
// Dependencies
var async = require('async');
var lodash = require('lodash');
var fs = require('fs');
var database = require('./database');
var helpers = require('./helpers');
var gmail = require('./gmail');
var jira = require('./jira');
var queue = require('./queue');

//========================================================================================================
var RecoverableError = require('./errors').RecoverableError;
var UnrecoverableError = require('./errors').UnrecoverableError;
var InterceptSignal = require('./errors').InterceptSignal;

//========================================================================================================
// Get detailed message from simple metadata
exports.getDetailedMessage = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        gmail.getMessage(message.id, (err, detailedMessage) => {

            if (err) return reject(new RecoverableError({ code: 'RE001', message: 'Failed to get detailed message', src: err }));
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
        // Transformed Message Structure
        var transformedMessage = {
            cc: [],
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds,
            historyId: message.historyId,
            type: 'standard', // standard || reply
            subject: null, // empty if is a reply-type message 
            content: '',
            metadata: {},
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
        // Format CC
        if (headers['Cc'])
            transformedMessage.cc = headers['Cc'].split(/ *, */g);

        //-------------------------
        // Format sender
        if (headers['From'])
            transformedMessage.sender = headers['From'].match(/<.+@.+>/g)[0]
                .replace(/[<>]/g, '');

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
// Check message based on company policies (Sender)
exports.checkMessage = function (message, callback) {

    //-------------------------    
    var promise = Promise.resolve(message);
    /* TO_DO */
    // var promise = Promise.reject(new InterceptSignal({code: 3}));

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Assign message project based on CC
exports.assignMessageProject = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        /* TO_DO */
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
// Remove message extra contents like quotes, signature
exports.removeMessageExtras = function (message, callback) {

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        // Remove Gmail Extra
        message.content = message.content.replace(/(^\w.+:\r?\n)?(^>.*(\r?\n|$))+/gm, ''); // Reply Quotes
        message.content = message.content.replace(/(\r?\n)+-- *\r?\n[^]+$/g, ''); // Signature
        message.content = message.content.replace(/(\r?\n)+(-+ *Forwarded message *-+)\r?\n(.+\r?\n)+/gm, ''); // Forward notice

        //-------------------------
        // Remove Outlook Reply Quotes

        //-------------------------
        fulfill(message);
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Extract message metadata for Jira custom fields
exports.extractMessageMetadata = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------    
        if (message.type !== 'standard')
            return fulfill(message);

        //-------------------------        
        var metadata = message.content.match(/_______________ *\r?\n(.+\r?\n?)+/g);
        metadata = lodash.chain(metadata)
            .flatMapDeep(m => m.match(/[^\r\n]+/g))
            .map(m => m.split(/ *: */g))
            .filter(m => m.length >= 2)
            .keyBy('0')
            .mapValues('1')
            .value();

        //-------------------------                
        message.metadata = metadata;

        //-------------------------
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
            if (err && err.code !== 11000) // Natural disaster (Network failure blah blah)
                reject(new RecoverableError({ code: 'RE002', message: 'Failed to create mapping', src: err }));

            //-----------
            else if (err && err.code === 11000) { // Message existed
                // Check if message already mapped to a Jira entity
                database.getMapping(message, (err2, mapping) => {
                    if (err2) // Natural disaster 2 (Network failure,... , again T_T)
                        return reject(new RecoverableError({ code: 'RE003', message: 'Failed to read mapping', src: err2 }));

                    // Message wasn't mapped to any Jira entity, could be a result of re-enqueue, or retry of recoverable error
                    if (!mapping.issueId && !mapping.issueKey)
                        return fulfill(message);

                    // Message already associated with a Jira entity
                    reject(new InterceptSignal({ code: 'IS003', message: 'Message was already processed', src: err }));
                });
            }
            //-----------
            else { // Message doesn't exist
                fulfill(message);
            }
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Jira Issue
exports.createJiraIssue = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        jira.createIssue(message, (err, issue) => {
            if (err)
                return reject(new RecoverableError({ code: 'RE004', message: 'Failed to create Jira Issue', src: err }));

            // Assign Issue                
            message.issueId = issue.id;
            message.issueKey = issue.key;

            fulfill(message);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Jira Comment
exports.createJiraComment = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        database.findReplySourceMapping(message, (err, mapping) => {
            if (err)
                return reject(new RecoverableError({ code: 'RE005', message: 'Failed to read reply source mapping', src: err }));

            if (!mapping)
                return reject(new InterceptSignal({ code: 'IS004', message: 'No reply source mapping. SQS could be sending message out-of-order. Try re-enqueueing', src: err }));

            // Assign Reply Source Issue
            message.issueId = mapping.issueId;
            message.issueKey = mapping.issueKey;

            // Create comment
            jira.createComment(message, (err, comment) => {
                if (err)
                    return reject(new RecoverableError({ code: 'RE006', message: 'Failed to create Jira Comment', src: err }));

                message.commentId = comment.id;
                fulfill(message);
            });
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Jira Entity based on message type
exports.createJiraEntity = function (message, callback) {

    if (message.type === 'standard')
        return helpers.wrapAPI(exports.createJiraIssue(message), callback);

    if (message.type === 'reply')
        return helpers.wrapAPI(exports.createJiraComment(message), callback);
};

//========================================================================================================
// Update mapping
exports.updateMapping = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        database.updateMapping(message, (err, mapping) => {
            if (err)
                return reject(new UnrecoverableError({ code: 'UE001', message: 'Failed to update mapping after creating Jira Entity', src: err }));
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

        //-------------------------    
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
            if (err)
                return reject(new UnrecoverableError({ code: 'UE002', message: 'Failed to upload attachments', src: err }));

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
            if (err)
                return reject(new UnrecoverableError({ code: 'UE003', message: 'Failed to mark message processed', src: err }));
            fulfill(message);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};
