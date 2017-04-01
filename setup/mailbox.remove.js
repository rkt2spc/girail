//========================================================================================================
// Node Dependencies
var fs = require('fs');
var path = require('path');
var nativeUtil = require('util');

//========================================================================================================
// External Dependencies
var yargs = require('yargs');
var lodash = require('lodash');
var async = require('async');
var readlineSync = require('readline-sync');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

//========================================================================================================
// Lib Dependencies
var utils = require('../lib/utilities');
var configsAdapter = require('../lib/configs-adapter');

//========================================================================================================
// Configurations
var gmailSettings = configsAdapter.loadGmailSettings();
var googleCredentials = configsAdapter.loadGoogleCredentials();
var mailboxSettings = configsAdapter.loadMailboxSettings();

//========================================================================================================
// Arguments
var argv = yargs
    .usage('Usage: $0 -m [mailbox]')
    .help('h')
    .alias('h', 'help')
    .demandOption(['mailbox'])
    .example('$0 --mailbox foo@mail.com')
    .alias('m', 'mailbox')
    .describe('m', 'The mail box you want removed')
    .argv;

//========================================================================================================
console.log('\n===================================================');
var mailbox = mailboxSettings.find((mb) => mb.name === argv.mailbox);

if (!mailbox) {
    console.log('No mailbox found with given name:', argv.mailbox);
    console.log('Available mailboxes are:', mailboxSettings.map((mb) => mb.name));
    return;
}

if (readlineSync.keyInYN(`Are you sure you want to remove mailbox <${mailbox.name}>?`)) {
    mailboxSettings.splice(mailboxSettings.indexOf(mailbox), 1);
    configsAdapter.updateMailboxSettings(mailboxSettings);
    console.log(`Mailbox <${argv.mailbox}> removed`);
} else {
    console.log('Cancelled');
}
