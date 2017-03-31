//========================================================================================================
// Node Dependencies
var fs = require('fs');
var path = require('path');

//========================================================================================================
// External Dependencies
var yaml = require('js-yaml');
var lodash = require('lodash');

//========================================================================================================
// Lib Dependencies
var utils = require('./utilities');

//========================================================================================================
// Directories
const CONFIGS_DIR = path.resolve(__dirname, '..', 'configs');
const CREDENTIALS_DIR = path.resolve(__dirname, '..', 'credentials');

//========================================================================================================
// Paths
const GMAIL_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'gmail.settings.yaml');
const MAILBOX_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'mailbox.settings.yaml');
const JIRA_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'jira.settings.yaml');
const AWS_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'aws.settings.yaml');
const DATABASE_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'database.settings.yaml');

const GOOGLE_CREDENTIALS_PATH = path.resolve(CREDENTIALS_DIR, 'google.credentials.json');
const JIRA_CREDENTIALS_PATH = path.resolve(CREDENTIALS_DIR, 'jira.credentials.json');

//========================================================================================================
// Settings
var gmailSettings = yaml.safeLoad(fs.readFileSync(GMAIL_SETTINGS_PATH, 'utf8'));
var mailboxSettings = yaml.safeLoad(fs.readFileSync(MAILBOX_SETTINGS_PATH, 'utf8')) || [];
var jiraSettings = yaml.safeLoad(fs.readFileSync(JIRA_SETTINGS_PATH, 'utf8'));
var awsSettings = yaml.safeLoad(fs.readFileSync(AWS_SETTINGS_PATH, 'utf8'));
var databaseSettings = yaml.safeLoad(fs.readFileSync(DATABASE_SETTINGS_PATH, 'utf8'));

//========================================================================================================
// Credentials
var googleCredentials = JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8'));
var jiraCredentials = JSON.parse(fs.readFileSync(JIRA_CREDENTIALS_PATH, 'utf8'));

//========================================================================================================
// Gmail
exports.loadGoogleCredentials = function() { return googleCredentials; };
exports.loadGmailSettings = function() { return gmailSettings; };
exports.updateGmailSettings = function(newGmailSettings) { 
    Object.assign(gmailSettings, newGmailSettings);
    var yamlSettings = yaml.safeDump(gmailSettings);
    return fs.writeFileSync(GMAIL_SETTINGS_PATH, yamlSettings);
};

//========================================================================================================
// Mailbox
exports.loadMailboxSettings = function() { return mailboxSettings; };
exports.updateMailboxSettings = function(newMailboxSettings) {
    mailboxSettings = newMailboxSettings;
    var yamlSettings = yaml.safeDump(mailboxSettings);
    return fs.writeFileSync(MAILBOX_SETTINGS_PATH, yamlSettings);
};
exports.addMailbox = function(newMailboxSetting) {
    mailboxSettings.push(newMailboxSetting);
    var yamlSettings = yaml.safeDump(mailboxSettings);
    return fs.writeFileSync(MAILBOX_SETTINGS_PATH, yamlSettings);
};

//========================================================================================================
// Jira
exports.loadJiraCredentials = function() { return jiraCredentials; };
exports.loadJiraSettings = function() { return jiraSettings; };
exports.updateJiraSettings = function(newJiraSettings) {
    Object.assign(jiraSettings, newJiraSettings);
    var yamlSettings = yaml.safeDump(jiraSettings);
    return fs.writeFileSync(JIRA_SETTINGS_PATH, yamlSettings);
};

//========================================================================================================
// Aws
exports.loadAwsSettings = function() { return awsSettings; };

//========================================================================================================
// Database
exports.loadDatabaseSettings = function() { return databaseSettings; };
