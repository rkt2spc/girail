//========================================================================================================
// Dependencies
var async = require('async');
var JiraApi = require('jira-client');
var database = require('./database');
var AppError = require('./errors').AppError;

//========================================================================================================
// Credentials

//========================================================================================================
// Jira Service
var jiraService = new JiraApi({
    protocol: 'https',
    host: 'nmtuan.atlassian.net',
    username: 'admin',
    password: '123456',
    apiVersion: '2',
    strictSSL: true
});

//========================================================================================================
// Retrieve Added Messages: params: { lastHistoryId, newHistoryId }
exports.createIssue = function (params, callback) {
    //-------------------------        
    var promise = new Promise((fulfill, reject) => {

        //-------------------------        
        if (!params || !params.historyId)
            return reject(new Error(`RetrieveAddedMessages: Missing parameters, got ${params}`));

        if (params.historyId <= 0)
            return reject(new Error(`RetrieveAddedMessages: Invalid historyId, expected > 0, got ${params.historyId}`));

        //-------------------------
        async.waterfall([
            function (next) {
                gmailService.users.history.list({
                    userId: 'me',
                    historyTypes: 'messageAdded',
                    startHistoryId: params.historyId
                },
                    function (err, response) {
                        if (err) return next(err);
                        if (!response.history || response.history.length === 0)
                            return next(new Error(`RetrieveAddedMessages: No events happen since provided historyId ${params.historyId}`));

                        var histories = lodash.chain(response.histories)
                            .filter((h) => h.id < params.newHistoryId && h.messagesAdded && h.messagesAdded.length > 0)
                            .map((h) => h.messagesAdded)
                            .flattenDeep()
                            .uniqBy('message.id')
                            .map((h) => h.message);

                        next(null, messages);
                    });
            },
            function (addedMessages, next) {
                async.reduce(addedMessages, [], (memo, message, done) => {
                    gmailService.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full',
                        metadataHeaders: METADATA_HEADERS
                    }, (err, detailedMessage) => {
                        if (err && err.code !== 404) return done(err);

                        if (!err)
                            memo.push(detailedMessage);
                        else
                            console.log(`RetrieveAddedMessages: Can't get message detail, of message ${message.id}`);

                        done(null, memo);
                    });

                }, (err, detailedMessages) => {
                    if (err) return next(err);
                    next(null, detailedMessages);
                });
            }
        ], (err, addedDetailedMessages) => {
            if (err) return reject(err);
            fulfill({
                messages: addedDetailedMessages
            });
        });

    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Retrieve Added Messages: params: { lastHistoryId, newHistoryId }

