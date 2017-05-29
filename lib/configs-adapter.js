//------------------------------------------------------------------------------
// Node Dependencies
const fs = require('fs');
const path = require('path');

//------------------------------------------------------------------------------
// External Dependencies
const fsx = require('fs-extra');
const yaml = require('js-yaml');

//------------------------------------------------------------------------------
// Lib Dependencies

//------------------------------------------------------------------------------
// Directories
const CONFIGS_DIR = path.resolve(__dirname, '..', 'configs');
const CREDENTIALS_DIR = path.resolve(__dirname, '..', 'credentials');

//------------------------------------------------------------------------------
// Paths
const GMAIL_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'gmail.settings.yaml');
const MAILBOX_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'mailbox.settings.yaml');
const JIRA_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'jira.settings.yaml');
const AWS_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'aws.settings.yaml');
const DATABASE_SETTINGS_PATH = path.resolve(CONFIGS_DIR, 'database.settings.yaml');

const GOOGLE_CREDENTIALS_PATH = path.resolve(CREDENTIALS_DIR, 'google.credentials.json');
const JIRA_CREDENTIALS_PATH = path.resolve(CREDENTIALS_DIR, 'jira.credentials.json');

//------------------------------------------------------------------------------
// Ensure files
fsx.ensureFileSync(GMAIL_SETTINGS_PATH);
fsx.ensureFileSync(MAILBOX_SETTINGS_PATH);
fsx.ensureFileSync(JIRA_SETTINGS_PATH);
fsx.ensureFileSync(AWS_SETTINGS_PATH);
fsx.ensureFileSync(DATABASE_SETTINGS_PATH);

fsx.ensureFileSync(GOOGLE_CREDENTIALS_PATH);
fsx.ensureFileSync(JIRA_CREDENTIALS_PATH);

//------------------------------------------------------------------------------
// Settings
const gmailSettings = yaml.safeLoad(fs.readFileSync(GMAIL_SETTINGS_PATH, 'utf8')) || {};
let mailboxSettings = yaml.safeLoad(fs.readFileSync(MAILBOX_SETTINGS_PATH, 'utf8')) || [];
const jiraSettings = yaml.safeLoad(fs.readFileSync(JIRA_SETTINGS_PATH, 'utf8')) || {};
const awsSettings = yaml.safeLoad(fs.readFileSync(AWS_SETTINGS_PATH, 'utf8')) || {};
const databaseSettings = yaml.safeLoad(fs.readFileSync(DATABASE_SETTINGS_PATH, 'utf8')) || {};

//------------------------------------------------------------------------------
// Credentials
const googleCredentials = JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8') || '{}');
const jiraCredentials = JSON.parse(fs.readFileSync(JIRA_CREDENTIALS_PATH, 'utf8') || '{}');

//------------------------------------------------------------------------------
// Gmail
exports.loadGoogleCredentials = () => googleCredentials;
exports.updateGoogleCredentials = (newGoogleCredentials) => {
  Object.assign(googleCredentials, newGoogleCredentials);
  const jsonCredentials = JSON.stringify(googleCredentials);
  return fs.writeFileSync(GOOGLE_CREDENTIALS_PATH, jsonCredentials);
};
exports.loadGmailSettings = () => gmailSettings;
exports.updateGmailSettings = (newGmailSettings) => {
  Object.assign(gmailSettings, newGmailSettings);
  const yamlSettings = yaml.safeDump(gmailSettings);
  return fs.writeFileSync(GMAIL_SETTINGS_PATH, yamlSettings);
};

//------------------------------------------------------------------------------
// Mailbox
exports.loadMailboxSettings = () => mailboxSettings;
exports.updateMailboxSettings = (newMailboxSettings) => {
  mailboxSettings = newMailboxSettings;
  const yamlSettings = yaml.safeDump(mailboxSettings);
  return fs.writeFileSync(MAILBOX_SETTINGS_PATH, yamlSettings);
};
exports.addMailbox = (newMailboxSetting) => {
  mailboxSettings.push(newMailboxSetting);
  const yamlSettings = yaml.safeDump(mailboxSettings);
  return fs.writeFileSync(MAILBOX_SETTINGS_PATH, yamlSettings);
};

//------------------------------------------------------------------------------
// Jira
exports.loadJiraCredentials = () => jiraCredentials;
exports.updateJiraCredentials = (newJiraCredentials) => {
  Object.assign(jiraCredentials, newJiraCredentials);
  const jsonCredentials = JSON.stringify(jiraCredentials);
  fs.writeFileSync(JIRA_CREDENTIALS_PATH, jsonCredentials);
};
exports.loadJiraSettings = () => jiraSettings;
exports.updateJiraSettings = (newJiraSettings) => {
  Object.assign(jiraSettings, newJiraSettings);
  const yamlSettings = yaml.safeDump(jiraSettings);
  return fs.writeFileSync(JIRA_SETTINGS_PATH, yamlSettings);
};

//------------------------------------------------------------------------------
// Aws
exports.loadAwsSettings = () => awsSettings;
exports.updateAwsSettings = (newAwsSettings) => {
  Object.assign(awsSettings, newAwsSettings);
  const yamlSettings = yaml.safeDump(awsSettings);
  return fs.writeFileSync(AWS_SETTINGS_PATH, yamlSettings);
};

//------------------------------------------------------------------------------
// Database
exports.loadDatabaseSettings = () => databaseSettings;
exports.updateDatabaseSettings = (newDatabaseSettings) => {
  Object.assign(databaseSettings, newDatabaseSettings);
  const yamlSettings = yaml.safeDump(databaseSettings);
  return fs.writeFileSync(DATABASE_SETTINGS_PATH, yamlSettings);
};
