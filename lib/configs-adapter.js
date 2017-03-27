//========================================================================================================
// Node Dependencies
var fs = require('fs');
var path = require('path');

//========================================================================================================
// External Dependencies
var yaml = require('js-yaml');

//========================================================================================================
// Lib Dependencies
var utils = require('./utilities');

//========================================================================================================
// Directories
const CONFIGS_DIR = path.resolve(__dirname, '..', 'configs');
const CREDENTIALS_DIR = path.resolve(__dirname, '..', 'credentials');

//========================================================================================================
// Paths
const CORE_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'core.settings.yaml');
const MAILBOX_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'mailbox.settings.yaml');

//========================================================================================================
// Settings
try {
    var coreSettings = yaml.safeLoad(fs.readFileSync(CORE_SETTINGS_PATH, 'utf8'));
    var mailboxSettings = yaml.safeLoad(fs.readFileSync(MAILBOX_SETTINGS_PATH, 'utf8'));
}
catch(e) {
    console.log('Failed to load yaml settings'); 
    console.log(e.message);
}

//========================================================================================================
// Credentials
// var googleCredentials   = require(path.resolve(CREDENTIALS_DIR, 'google-secrets.json'));
// var googleTokens        = require(path.resolve(CREDENTIALS_DIR, 'google-tokens.json'));
// var jiraCredentials     = require(path.resolve(CREDENTIALS_DIR, 'jira-secrets.json'));

//========================================================================================================
// Gmail
exports.loadGmailSettings   = function() { return coreSettings.gmail; };

exports.loadMailboxSettings = function() { return mailboxSettings; };
exports.updateMailboxSettings = function(newMailboxSettings) { 
    var yamlSettings = yaml.safeDump(newMailboxSettings);
    return fs.writeFileSync(MAILBOX_SETTINGS_PATH, yamlSettings);
};

//========================================================================================================
// Jira
exports.loadJiraSettings = function() { return coreSettings.jira; };
exports.updateJiraSettings = function(newJiraSettings) {
    coreSettings.jira = newJiraSettings;
    var yamlSettings = yaml.safeDump(coreSettings);
    return fs.writeFileSync(CORE_SETTINGS_PATH, yamlSettings);
};

//========================================================================================================
// Aws
exports.loadAwsSettings = function() { return coreSettings.aws; };

//========================================================================================================

