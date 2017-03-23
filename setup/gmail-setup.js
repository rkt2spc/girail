//========================================================================================================
// Dependencies
var path = require('path');
var fs = require('fs');
var lodash = require('lodash');
var readline = require('readline');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var helpers = require('../helpers');

//========================================================================================================
// Configurations
var Configs = {
    SCOPES: ['https://mail.google.com/'],
    GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH || path.resolve(__dirname, '..', 'credentials', 'google-secret.json'),
    GOOGLE_TOKEN_PATH: process.env.GOOGLE_TOKEN_PATH || path.resolve(__dirname, '..', 'credentials', 'google-token.json'),
    GMAIL_CONFIG_PATH: process.env.GMAIL_CONFIG_PATH || path.resolve(__dirname, '..', 'configs', 'gmail-conf.json')
};
var gmailConfigs = require('../configs/gmail-conf.json');

//========================================================================================================
// Load setCredentials
var loadCredentials = function () {
    return new Promise((fulfill, reject) => {
        fs.readFile(Configs.GOOGLE_CREDENTIALS_PATH, (err, content) => {
            if (err) reject(err);
            else {
                try {
                    var jsContent = JSON.parse(content);
                    fulfill(jsContent);
                }
                catch (parseErr) {
                    reject(parseErr);
                }
            }
        });
    });
};

//========================================================================================================
// Create Auth Client
var createAuthClient = function () {
    var credentials = require(Configs.GOOGLE_CREDENTIALS_PATH).installed;
    return new OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uris[0]
    );
};

//========================================================================================================
// Acquire Auth Token Helpers
var getNewToken = function (oauth2Client) {
    return new Promise((fulfill, reject) => {
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: Configs.SCOPES
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code from that page here: ', function (code) {
            rl.close();
            oauth2Client.getToken(code, function (err, token) {
                if (err) reject(err);
                else {
                    storeToken(token)
                        .then(() => fulfill(token))
                        .catch((e) => reject(e));
                }
            });
        });
    });
};

var storeToken = function (token) {
    return new Promise((fulfill, reject) => {
        fs.mkdir(path.dirname(Configs.GOOGLE_TOKEN_PATH), (err) => {
            if (err && err.code !== 'EEXIST') return reject(err);
            fs.writeFile(Configs.GOOGLE_TOKEN_PATH, JSON.stringify(token), (e) => {
                if (e) reject(e);
                else {
                    console.log('Token stored to', Configs.GOOGLE_TOKEN_PATH);
                    fulfill(token);
                }
            });
        });
    });
};

//========================================================================================================
// Acquire Auth Token
var acquireAuthToken = function (oauth2Client) {
    return new Promise((fulfill, reject) => {
        fs.readFile(Configs.GOOGLE_TOKEN_PATH, (err, rawToken) => {
            if (err) {
                getNewToken(oauth2Client)
                    .then((newToken) => {
                        oauth2Client.setCredentials(newToken);
                        fulfill(oauth2Client);
                    })
                    .catch((e) => reject(e));
            }
            else {
                oauth2Client.setCredentials(JSON.parse(rawToken));
                fulfill(oauth2Client);
            }
        });
    });
};

//========================================================================================================
var listGmailLabels = function (authClient, callback) {
    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        var gmail = google.gmail({
            version: 'v1',
            auth: authClient
        });

        gmail.users.labels.list({
            userId: 'me',
        }, (err, response) => {

            if (err) return reject(err);

            var labels = response.labels || [];
            labels = lodash.chain(labels)
                .keyBy('name')
                .mapValues('id')
                .value();

            gmailConfigs.labels = labels;
            return fulfill(labels);
        });
    });

    //-------------------------    
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Setup Promise
var setupPromise = Promise.resolve()
    // Refresh Google Tokens
    .then(loadCredentials)
    .then(createAuthClient)
    .then(acquireAuthToken)
    .then(helpers.log('OK! Google credentials updated!'))
    // Update Gmail Configs (default labels)
    .then(listGmailLabels)
    .then(() => fs.writeFileSync(Configs.GMAIL_CONFIG_PATH, JSON.stringify(gmailConfigs, null, 2)))
    .then(helpers.log('OK! Gmail configs updated!'))
    .catch((err) => {
        console.log('Failed to setup gmail');
        console.log(err);
    });

//========================================================================================================
// Exports
module.exports = function (callback) {
    return helpers.wrapAPI(setupPromise, callback);
};