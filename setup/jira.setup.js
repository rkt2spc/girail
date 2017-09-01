/* eslint no-console: off */

//------------------------------------------------------------------------------
// Node Dependencies
const nativeUtil = require('util');

//------------------------------------------------------------------------------
// External Dependencies
const lodash = require('lodash');
const JiraApi = require('jira-client');
const readlineSync = require('readline-sync');

//------------------------------------------------------------------------------
// Lib Dependencies
const configsAdapter = require('../lib/configs-adapter');

//------------------------------------------------------------------------------
const newJiraSettings = {
  host               : '',
  api_version        : '2',
  default_issue_type : { name: 'Bug' },
  default_reporter   : { name: 'admin' },
  required_fields    : ['Brand', 'Affects Version/s', 'Labels'],
  fields             : {},
};

const newJiraCredentials = {
  username : '',
  password : '',
};

console.log('\n\nInitializing Jira setup...');
console.log('======================================================');
newJiraSettings.host = readlineSync.question('Enter your jira hostname (required): ');
newJiraCredentials.username = readlineSync.question('Enter your jira username (required): ');
newJiraCredentials.password = readlineSync.question('Enter your jira password (required): ', {
  hideEchoBack : true,
  mask         : '*',
});
newJiraSettings.default_issue_type.name = readlineSync.question('Enter your jira default issue type (default Bug): ');
newJiraSettings.default_reporter.name = readlineSync.question('Enter your jira default reporter (default admin): ');

if (!newJiraSettings.default_issue_type.name || newJiraSettings.default_issue_type.name.length === 0) { newJiraSettings.default_issue_type.name = 'Bug'; }

if (!newJiraSettings.default_reporter.name || newJiraSettings.default_reporter.name.length === 0) { newJiraSettings.default_reporter.name = 'admin'; }


const jira = new JiraApi({
  strictSSL  : true,
  protocol   : 'https',
  host       : newJiraSettings.host,
  apiVersion : newJiraSettings.api_version,
  username   : newJiraCredentials.username,
  password   : newJiraCredentials.password,
});

console.log('\n======================================================');
console.log('Getting Jira required fields:', newJiraSettings.required_fields);
jira.listFields()
  .then((fields) => {
    fields = fields.filter(f => newJiraSettings.required_fields.includes(f.name));
    if (fields.length !== newJiraSettings.required_fields.length) {
      console.log('Not enough Jira required fields, please alert an administrator to create them');
      return;
    }
    console.log('All required fields are present!');

    newJiraSettings.fields = lodash.chain(fields)
      .sortBy('name')
      .keyBy('name')
      .mapValues('id')
      .value();

    console.log('\n======================================================');
    console.log('Review your Jira settings:');
    console.log(nativeUtil.inspect(newJiraSettings));
    console.log('\nReview your Jira credentials:');
    console.log(nativeUtil.inspect(newJiraCredentials));
    if (readlineSync.keyInYN('\nIs this okay?')) {
      configsAdapter.updateJiraSettings(newJiraSettings);
      console.log('Jira Settings Updated');
      configsAdapter.updateJiraCredentials(newJiraCredentials);
      console.log('Jira Credentials Updated');
    } else { console.log('Cancelled'); }
  })
  .catch((err) => console.log(err));
