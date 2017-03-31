//========================================================================================================
// Node Dependencies
var path = require('path');
var fs = require('fs');

//========================================================================================================
// External Dependencies
var lodash = require('lodash');
var async = require('async');
var readline = require('readline');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

//========================================================================================================
// Lib Dependencies
var configsAdapter = require('../lib/configs-adapter');
var utils = require('../lib/utilities');

//========================================================================================================
// Configurations
var gmailSettings = configsAdapter.loadGmailSettings();
var mailboxSettings = configsAdapter.loadMailboxSettings();

//========================================================================================================
// Credentials
var googleCredentials = configsAdapter.loadGoogleCredentials();

//========================================================================================================
// Get New Auth Tokens
var getNewTokens = function (oauth2Client, callback) {

    //-------------------------        
    var promise = new Promise((fulfill, reject) => {

        // Retrieve new tokens
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: gmailSettings.access.type,
            scope: gmailSettings.access.scope
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Enter the code from that page here: ', function (code) {
            rl.close();
            oauth2Client.getToken(code, function (err, tokens) {
                if (err) reject(err);
                else fulfill(tokens);
            });
        });
    });

    //-------------------------        
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// List Mailbox Gmail Labels
var listMailboxLabels = function (oauth2Client, callback) {
    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        var gmail = google.gmail({
            version: 'v1',
            auth: oauth2Client
        });

        gmail.users.labels.list({
            userId: 'me',
        }, (err, response) => {

            if (err) return reject(err);

            var labels = response.labels || [];
            labels = lodash.chain(labels)
                .filter((l) => gmailSettings.required_labels.includes(l.name))
                .keyBy('name')
                .mapValues('id')
                .value();

            return fulfill(labels);
        });
    });

    //-------------------------    
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Exports
module.exports = function (callback) {

    //-------------------------        
    var promise = new Promise((fulfill, reject) => {

        console.log('\n\nInitializing Gmail setup...');
        console.log('======================================================');

        async.eachSeries(mailboxSettings, (mailbox, next) => {

            //-------------------------            
            console.log('Setting up mailbox:', mailbox.name);

            //-------------------------               
            if (!mailbox.tokens)
                return reject(new Error(`Missing tokens for mailbox ${mailbox.name}`));

            var tokens = JSON.parse(Buffer.from(mailbox.tokens, 'base64').toString('utf8'));

            //-------------------------        
            var oauth2Client = new OAuth2(
                googleCredentials.installed.client_id,
                googleCredentials.installed.client_secret,
                googleCredentials.installed.redirect_uris[0]
            );
            oauth2Client.setCredentials(tokens);

            //-------------------------   
            Promise.resolve()
                .then(() => listMailboxLabels(oauth2Client))
                .then((labels) => mailbox.labels = labels)
                .then(() => configsAdapter.updateMailboxSettings(mailboxSettings))
                .then(() => next())
                .catch((err) => next(err));

        }, (err) => {
            if (err) return reject(err);
            fulfill();
        });

    });

    //-------------------------        
    return utils.wrapAPI(promise, callback);
};