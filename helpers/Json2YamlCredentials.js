//========================================================================================================
// Node Dependencies
var fs = require('fs');
var path = require('path');

//========================================================================================================
// External Dependencies
var yargs = require('yargs');
var yaml = require('js-yaml');

//========================================================================================================
// Lib Dependencies
var configsAdapter = require('./lib/configs-adapter');

//========================================================================================================
// Configurations
var argv = yargs
    .usage('Usage: $0 -m [string] -c [filepath]\n')
    .demandOption(['mailbox', 'credentials'])
    .example('$0 --mailbox foo@mail.com --credentials /path/to/my/credentials.json')
    .alias('m', 'mailbox')
    .describe('m', 'Your mailbox name')
    .alias('c', 'credentials')    
    .describe('c', 'Path your google-json-credentials')
    .epilogue('This script parse your default google credentials in json and add it to our settings as yaml')
    .argv;

var mailboxSettings = configsAdapter.loadMailboxSettings();

//========================================================================================================
// Arguments
var mailbox_name = argv.mailbox;
var credentials_path = argv.credentials;

//========================================================================================================
// Find mailbox
var mailbox = mailboxSettings.find((mb) => mb.name === mailbox_name);
if (!mailbox) {
    console.log('Invalid mailbox, valid values are:', mailboxSettings.map((mb) => mb.name));
    return;
}

//========================================================================================================
// Parse JSON Credentials
try {
    var credentials = Buffer.from(fs.readFileSync(path.resolve(credentials_path)), 'utf8').toString('base64');  
}
catch (e) {
    console.log('Failed to parse json credentials');
    console.log(e.message);
    return;
}

//========================================================================================================
// Update Settings
mailbox.credentials = credentials;
configsAdapter.updateMailboxSettings(mailboxSettings);

