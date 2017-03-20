var path = require('path');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

//========================================================================================================
var Configs = {
    CREDENTIALS_PATH: process.env.CREDENTIALS_PATH || path.join(__dirname, 'credentials', 'oauth-secret.json'),
    TOKEN_PATH: process.env.TOKEN_PATH || path.join(__dirname, 'credentials', 'access-token.json'),
    SCOPES: ['https://mail.google.com/']
};

//========================================================================================================
var database = require('./database');

//========================================================================================================

//========================================================================================================
// Load setCredentials
var loadCredentials = function () {
    return new Promise((fulfill, reject) => {
        fs.readFile(Configs.CREDENTIALS_PATH, (err, content) => {
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
    var credentials = require(Configs.CREDENTIALS_PATH).installed;
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
        fs.mkdir(path.dirname(Configs.TOKEN_PATH), (err) => {
            if (err && err.code !== 'EEXIST') return reject(err);
            fs.writeFile(Configs.TOKEN_PATH, JSON.stringify(token), (e) => {
                if (e) reject(e);
                else {
                    console.log('Token stored to', Configs.TOKEN_PATH);
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
        fs.readFile(Configs.TOKEN_PATH, (err, rawToken) => {
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
Promise.resolve(true)
    .then(loadCredentials)
    .then(createAuthClient)
    .then(acquireAuthToken)
    .then((authClient) => {
        console.log('OK! OAuth2 credentials updated!');
    })
    .catch((err) => {
        console.log('Failed to retrieve OAuth2 credentials');
        console.log(err);
    })
    .then(() => process.exit(0));