//========================================================================================================
// Node Dependencies
var nativeUtil = require('util');
var fs = require('fs');
var path = require('path');

//========================================================================================================
// External Dependencies
var readlineSync = require('readline-sync');

//========================================================================================================
// Lib Dependencies
var configsAdapter = require('../lib/configs-adapter');

//========================================================================================================
// Configurations

//========================================================================================================
var newGmailSettings = {
    api_version: "1",
    access: {
        "type": "offline",
        "scope": [
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.labels"
        ]
    },
    metadata_headers: [
        "In-Reply-To",
        "References",
        "From",
        "Date",
        "Message-ID",
        "Subject",
        "To"
    ],
    required_labels: [
        "Unprocessed",
        "Enqueued",
        "Unprocessible",
        "Processed"
    ]
};

console.log('\n\nInitializing Gmail setup...');
console.log('======================================================');
var pathToCredentials = readlineSync.questionPath('Enter the path to your Google Credentials: ');
var newGoogleCredentials = JSON.parse(fs.readFileSync(path.resolve(pathToCredentials), 'utf8'));

console.log('======================================================');
console.log('Review your Gmail settings:');
console.log(nativeUtil.inspect(newGmailSettings));
console.log('\nReview your Google Credentials:');
console.log(nativeUtil.inspect(newGoogleCredentials));
if (readlineSync.keyInYN('\nIs this okay?')) {
    configsAdapter.updateGmailSettings(newGmailSettings);
    console.log('Gmail Settings Updated');
    configsAdapter.updateGoogleCredentials(newGoogleCredentials);
    console.log('Google Credentials Updated');
}