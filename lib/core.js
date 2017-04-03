//========================================================================================================
// Node Dependencies
var fs = require('fs');
var crypto = require('crypto');

//========================================================================================================
// External Dependencies
var async = require('async');
var lodash = require('lodash');

//========================================================================================================
// Lib Dependencies
var configsAdapter  = require('./configs-adapter');
var utils           = require('./utilities');
var database        = require('./database');
var gmail           = require('./gmail');
var jira            = require('./jira');
var queue           = require('./queue');
var logger          = require('./logger').consumerLogger;

//========================================================================================================
// Configurations
var mailboxConfigs = configsAdapter.loadMailboxSettings();

//========================================================================================================
// Errors
var RecoverableError    = require('./errors').RecoverableError;
var UnrecoverableError  = require('./errors').UnrecoverableError;
var DropSignal          = require('./errors').DropSignal;
var RequeueSignal       = require('./errors').RequeueSignal;

//========================================================================================================
// Mailboxes
var mailboxes = lodash.keyBy(gmail.generateMailboxes(), 'name');

//========================================================================================================
// Assign message mailbox
exports.assignMessageMailbox = function (message, callback) {

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        //-------------------------    
        if (!message.mailbox)
            return reject(new DropSignal({code: 'DS001', message: 'Invalid message, no mailbox property'}));

        var mailbox = mailboxes[message.mailbox];
        if (!mailbox)
            return reject(new DropSignal({code: 'DS002', message: `Invalid message, invalid mailbox ${message.mailbox}`}));

        message.mailbox = mailbox;
        fulfill(message);
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);

};

//========================================================================================================
// Get message details from simple metadata
exports.getMessageDetails = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        message.mailbox.getMessage(message.id, (err, details) => {

            if (err)
                return reject(new RecoverableError({ code: 'RE001', message: 'Gmail Failure: Getting message details', src: err }));

            Object.assign(message, details);
            fulfill(message);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Format Gmail Messages to easy to work with structure
exports.formatMessage = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        // Transformed Message Structure
        var transformedMessage = {
            mailbox: message.mailbox,
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds,
            historyId: message.historyId,

            type: 'standard',
            cc: [],
            senders: [],
            receivers: [],
            subject: '',
            content: '',
            contentHash: '',
            attachments: [],

            metadata: {},
            headers: {}
        };

        //-------------------------
        // Parse headers      
        var headers = lodash.chain(message.payload.headers)
            .keyBy('name')
            .mapValues('value')
            .mapKeys((v, k) => lodash.toLower(k))
            .value();
        
        transformedMessage.headers = headers;

        //-------------------------
        // Format Subject
        if (headers['subject'])
            transformedMessage.subject = headers['subject'];

        //-------------------------
        // Format CC
        if (headers['cc']) {
            transformedMessage.cc = headers['cc'].split(/ *, */g);
            transformedMessage.cc = transformedMessage.cc.map((m) => {
                var match = m.match(/<(.+@.+)>/g);
                if (match && match[0])
                    return match[0].replace(/[<>]/g, '');
                else
                    return m;
            });
        }

        //-------------------------
        // Format receiver
        if (headers['to']) {
            transformedMessage.receivers = headers['to'].split(/ *, */g);
            transformedMessage.receivers = transformedMessage.receivers.map((r) => {
                var match = r.match(/<(.+@.+)>/g);
                if (match && match[0])
                    return match[0].replace(/[<>]/g, '');
                else
                    return r;
            });
        }
        transformedMessage.receivers = transformedMessage.receivers.concat(transformedMessage.cc);

        //-------------------------
        // Format sender
        if (headers['from']) {
            transformedMessage.senders = headers['from'].split(/ *, */g);
            transformedMessage.senders = transformedMessage.senders.map((s) => {
                var match = s.match(/<(.+@.+)>/g);
                if (match && match[0])
                    return match[0].replace(/[<>]/g, '');
                else
                    return s;
            });
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
        if (!transformedMessage.subject || transformedMessage.subject.length === 0)
            transformedMessage.subject = '(untitled)';

        if (transformedMessage.content.length === 0)
            transformedMessage.content = '(no content)';

        //-------------------------
        fulfill(transformedMessage);
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Check message based on company policies (Sender)
exports.checkMessage = function (message, callback) {

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        //-------------------------        
        var mailbox = message.mailbox;

        //-------------------------        
        if (mailbox.whitelist && lodash.intersection(mailbox.whitelist, message.senders).length < message.senders.length)
            return reject(new DropSignal({ code: 'DS003', message: 'Message was from unauthorized sender, un-whitelisted' }));

        //-------------------------        
        if (mailbox.blacklist && lodash.intersection(mailbox.blacklist, message.senders).length > 0)
            return reject(new DropSignal({ code: 'DS004', message: 'Message was from unauthorized sender, blacklisted' }));

        //-------------------------            
        fulfill(message);
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Check whether a message is type of reply or foward/standard
exports.categorizeMessage = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        if (!message.headers['in-reply-to'] && !message.headers['references']) {
            message.type = 'standard';
            fulfill(message);
        }
        // Message either a reply or a forwarded message
        else {
            message.mailbox.getThread(message.threadId, (err, thread) => {
                if (err)
                    return reject(new RecoverableError({ code: 'RE002', message: 'Gmail Failure: Getting message thread', src: err }));

                var threadMessages = thread.messages.map(t => t.id);

                // Message is a reply
                if (threadMessages.indexOf(message.id) > 0) {
                    message.type = 'reply';
                }
                // Message is forwarded
                else {
                    message.type = 'standard';
                    message.subject = message.subject.replace(/Fwd: /g, '');
                }

                fulfill(message);
            });
        }
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Assign message project based on CC
exports.assignMessageProject = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        var mailbox = message.mailbox;

        //-------------------------
        var mapping = mailbox.project_mappings.find((map) => lodash.intersection(message.receivers, map.receivers).length === map.receivers.length);
        if (!mapping)
            return reject(new DropSignal({ code: 'DS005', message: 'Message doesn\'t have valid Ccs' }));

        //-------------------------
        message.project = mapping.project;

        //-------------------------
        fulfill(message);
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
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
        // Remove Outlook Extra        
        message.content = message.content.replace(/________________________________ *\r?\n(.+:.+\r?\n)+/g, ''); // Reply Quotes, foward

        //-------------------------
        fulfill(message);
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Create message hash
exports.createMessageHash = function (message, callback) {

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        message.contentHash = crypto.createHash('sha512').update(message.content).digest('base64');

        //-------------------------
        fulfill(message);
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Prevent replication
exports.preventMessageReplication = function (message, callback) {

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        if (message.type === 'standard')
            return fulfill(message);

        database
            .ofMailbox(message.mailbox)
            .findDuplicatedMapping(message, (err, mapping) => {

                if (err)
                    return reject(new RecoverableError({ code: 'RE003', message: 'Database Failure: Finding duplicated mapping', src: err }));
                
                if (mapping)
                    return reject(new DropSignal({ code: 'DS006', message: 'Message was duplicated' }));

                return fulfill(message);
            });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
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
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Register mapping, make sure no dup passed
exports.registerMapping = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        database
            .ofMailbox(message.mailbox)
            .createMapping(message, (err, mapping) => {

                if (err && err.code !== 11000) // Natural disaster (Network failure blah blah)
                    reject(new RecoverableError({ code: 'RE004', message: 'Database Failure: Creating message mapping', src: err }));

                //-----------
                else if (err && err.code === 11000) { // Message existed
                    // Check if message already mapped to a Jira entity
                    database
                        .ofMailbox(message.mailbox)
                        .getMapping(message, (err, mapping) => {

                        if (err) // Another Natural disaster ^^
                            return reject(new RecoverableError({ code: 'RE005', message: 'Database Failure: Getting message mapping', src: err }));

                        // Message wasn't mapped to any Jira entity, could be a result of re-enqueue, or retry of recoverable error
                        if (!mapping.issueId && !mapping.issueKey)
                            return fulfill(message);

                        // Message already associated with a Jira entity
                        reject(new DropSignal({ code: 'DS007', message: 'Message was already processed', src: err }));
                    });
                }
                //-----------
                else { // Message doesn't exist
                    fulfill(message);
                }
            });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Jira Issue
exports.createJiraIssue = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        jira.createIssue(message, (err, issue) => {
            if (err)
                return reject(new RecoverableError({ code: 'RE006', message: 'Jira Failure: Creating Jira Issue', src: err }));

            // Assign Issue                
            message.issueId = issue.id;
            message.issueKey = issue.key;

            fulfill(message);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Jira Comment
exports.createJiraComment = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        database
            .ofMailbox(message.mailbox)
            .findReplySourceMapping(message, (err, mapping) => {
                if (err)
                    return reject(new RecoverableError({ code: 'RE007', message: 'Database Failure: Finding reply source mapping', src: err }));

                if (!mapping)
                    return reject(new RequeueSignal({ code: 'RS001', message: 'No reply source mapping. SQS could be sending message out-of-order. Try re-enqueueing', src: err }));

                // Assign Reply Source Issue
                message.issueId = mapping.issueId;
                message.issueKey = mapping.issueKey;

                // Create comment
                jira.createComment(message, (err, comment) => {
                    if (err)
                        return reject(new RecoverableError({ code: 'RE008', message: 'Jira Failure: Creating Jira Comment', src: err }));

                    message.commentId = comment.id;
                    fulfill(message);
                });
            });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Jira Entity based on message type
exports.createJiraEntity = function (message, callback) {

    if (message.type === 'standard')
        return utils.wrapAPI(exports.createJiraIssue(message), callback);

    if (message.type === 'reply')
        return utils.wrapAPI(exports.createJiraComment(message), callback);
};

//========================================================================================================
// Update mapping
exports.updateMapping = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        database
            .ofMailbox(message.mailbox)
            .updateMapping(message, (err, mapping) => {
                if (err)
                    return reject(new UnrecoverableError({ code: 'UE001', message: 'Database Failure: Updating mapping after creating Jira Entity', src: err, recoveryData: { message: message } }));
                
                fulfill(message);
            });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
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
            message.mailbox.getAttachment({
                messageId: message.id,
                attachmentId: attachment.id
            }, (err, data) => {
                if (err)
                    return cb(new UnrecoverableError({ code: 'UE002', message: 'Gmail Failure: Failed to download attachment', src: err, recoveryData: { messageId: message.id, attachmentId: attachment.id } }));

                logger.info(`Attachment Buffered ${attachment.filename} (${data.length} Bytes)`);
                jira.uploadAttachment({
                    issueId: message.issueId,
                    filename: attachment.filename,
                    mimeType: attachment.mimeType,
                    data: data
                }, (err) => {
                    if (err)
                        return cb(new UnrecoverableError({ code: 'UE003', message: 'Jira Failure: Failed to upload attachment', src: err, recoveryData: { messageId: message.id, attachmentId: attachment.id } }));

                    logger.info(`Attachment Uploaded ${attachment.filename}`);
                    cb(null);
                });
            });
        }, (err) => {
            if (err) return reject(err);
            fulfill(message);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Mark message processed
exports.markMessageProcessed = function (message, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        message.mailbox.markMessageProcessed(message, (err) => {
            if (err)
                return reject(new UnrecoverableError({ code: 'UE004', message: 'Gmail Failure: Marking message processed', src: err, recoveryData: { message: message } }));
            fulfill(message);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};