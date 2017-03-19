//========================================================================================================
// Dependencies
var async = require('async');
var lodash = require('lodash');
var helpers = require('./helpers');
var database = require('./database');

//========================================================================================================
// Configs
var eventConfigs = require('./credentials/events-conf.json');

//========================================================================================================
// Extract Event Data: params: { event: { data: { data }}}
exports.extractEventData = function (params, callback) {

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        if (!params || !params.event || !params.event.data || !params.event.data.data)
            return reject(new Error(`ExtractEventData: Missing parameters, got: ${params}`));

        //-------------------------
        var eventMessage = params.event.data.data;
        eventMessage = JSON.parse(Buffer.from(eventMessage, 'base64').toString());
        fulfill({
            historyId: eventMessage.historyId
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
}

//========================================================================================================
// Update Event Records: params: { historyId }
exports.updateEventRecords = function (params, callback) {

    //-------------------------        
    var promise = new Promise((fulfill, reject) => {

        //-------------------------        
        if (!params || !params.historyId)
            return reject(new Error(`UpdateEventRecords: Missing Parameters, got: ${params}`));

        //-------------------------        
        // Execute in series
        async.series({

            // Get last event historyId
            lastHistoryId: function (done) {
                database.getLatestEvent((err, event) => {
                    if (err) return next(err);
                    if (!event)
                        return next(null, eventConfigs.seedHistoryId);

                    next(null, event.historyId);
                });
            },

            // Create new event record
            newHistoryId: function (done) {
                database.addNewEvent({ historyId: params.historyId }, (err, event) => {
                    if (err) return next(err);
                    next(null, event.historyId);
                });
            }

        }, function (err, result) {
            if (err) return reject(err);
            if (result.lastHistoryId > result.newHistoryId)
                return reject(
                    new Error(`UpdateEventRecords: Invalid Parameters, lastHistoryId > newHistoryId (${result.lastHistoryId} > ${result.newHistoryId})`)
                );

            fulfill({
                lastHistoryId: result.lastHistoryId,
                newHistoryId: result.newHistoryId
            });
        });
    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
}

//========================================================================================================
// Format Gmail Messages to easy to work with structure
exports.formatMessages = function (params, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        if (!params || !params.messages)
            return reject(new Error(`FormatMessages: Missing Parameters, got: ${params}`));
        if (params.messages.length === 0)
            return reject(new Error(`FormatMessages: No messages to format`));

        //-------------------------    
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

        fulfill({
            messages: transformedMessages
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
}

//========================================================================================================
// Filter Messages based on company policies
exports.filterMessages = function (params, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        //-------------------------
        if (!params || !params.messages)
            return reject(new Error(`FilterMessages: Missing Parameters, got: ${params}`));

        if (params.messages.length <= 0)
            return reject(new Error(`FilterMessages: No messages to filter`));

        //-------------------------
        // Current passing all messages unfiltered
        fulfill({
            messages: params.messages
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
}

//========================================================================================================
// Deduplicate Messages across handlers
exports.deduplicateMessages = function (params, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        //-------------------------
        if (!params || !params.messages)
            return reject(new Error(`DeduplicateMessages: Missing Parameters, got: ${params}`));

        if (params.messages.length <= 0)
            return reject(new Error(`DeduplicateMessages: No messages to deduplicate`));

        //-------------------------
        async.reduce(params.messages, [], (memo, message, done) => {

            database.markMessageProcessing(message, (err) => {
                if (err && err.code !== 11000) return done(err); // System Error

                if (!err)
                    memo.push(message);
                else
                    console.log(`DeduplicateMessages: Can't mark message processing, of message: ${message.id}, err: ${err.message}`);

                done(null, memo);
            });
        }, (err, deduplicatedMessages) => {
            if (err) return reject(err);

            fulfill({
                messages: deduplicatedMessages
            });
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
}

//========================================================================================================
// 
exports.categorizeMessages = function (params, callback) {
    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        //-------------------------
        if (!params || !params.messages)
            return reject(new Error(`CategorizeMessages: Missing Parameters, got: ${params}`));

        if (params.messages.length <= 0)
            return reject(new Error(`CategorizeMessages: No messages to categorize`));

        //-------------------------
        var categorizedMessages = params.messages.map((message) => {

        });

        fulfill({
            messages: categorizedMessages
        });
    });
}