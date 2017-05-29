/* eslint no-console: off */

//------------------------------------------------------------------------------
// Node Dependencies
const nativeUtil = require('util');
const fs = require('fs');
const path = require('path');

//------------------------------------------------------------------------------
// External Dependencies
const readlineSync = require('readline-sync');

//------------------------------------------------------------------------------
// Lib Dependencies
const configsAdapter = require('../lib/configs-adapter');

//------------------------------------------------------------------------------
// Configurations

//------------------------------------------------------------------------------
const newGmailSettings = {
  api_version : '1',
  access      : {
    type  : 'offline',
    scope : [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
    ],
  },
  metadata_headers: [
    'In-Reply-To',
    'References',
    'From',
    'Date',
    'Message-ID',
    'Subject',
    'To',
  ],
  required_labels: [
    'Unprocessed',
    'Enqueued',
    'Unprocessible',
    'Processed',
  ],
};

console.log('\n\nInitializing Gmail setup...');
console.log('======================================================');
const pathToCredentials = readlineSync.questionPath('Enter the path to your Google Credentials: ');
const newGoogleCredentials = JSON.parse(fs.readFileSync(path.resolve(pathToCredentials), 'utf8'));

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
