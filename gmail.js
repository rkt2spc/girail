//========================================================================================================
// Dependencies
var async = require('async');
var google = require('googleapis');
var database = require('./database');
var AppError = require('./errors').AppError;

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
    auth: authClient
});

//========================================================================================================
// Get all unprocessed messages
exports.getUnprocessedMessages = function (callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        async.waterfall([
            function (next) {
                gmailService.users.messages.list({
                    usersId: 'me',
                    labelIds: ['Label_4']
                }, (err, response) => {
                    if (err) return callback(err);

                    var messages = response.messages;
                    next(messages);
                });
            },
            function (next) {
                
            }
        ]);
    });
}

//========================================================================================================

