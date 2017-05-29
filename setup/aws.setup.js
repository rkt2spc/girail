//------------------------------------------------------------------------------
// Node Dependencies
const nativeUtil = require('util');

//------------------------------------------------------------------------------
// External Dependencies
const readlineSync = require('readline-sync');

//------------------------------------------------------------------------------
// Lib Dependencies
const configsAdapter = require('../lib/configs-adapter');

//------------------------------------------------------------------------------
// Exports
console.log('\n\nInitializing AWS setup...');
console.log('======================================================');

//-------------------------
const newAwsSettings = {};
newAwsSettings.region = readlineSync.question('Enter your SQS Region (default us-west-2): ');
newAwsSettings.api_version = readlineSync.question('Enter your SQS API Version (default 2012-11-05): ');
newAwsSettings.queue_url = readlineSync.question('Enter your SQS Queue-URL (required): ');

if (!newAwsSettings.region) { newAwsSettings.region = 'us-west-2'; }

if (!newAwsSettings.api_version) { newAwsSettings.api_version = '2012-11-05'; }

if (!newAwsSettings.queue_url) { throw (new Error('AWS Settings: queue_url required!')); }

console.log('======================================================');
console.log('Review your AWS settings:');
console.log(nativeUtil.inspect(newAwsSettings));

if (readlineSync.keyInYN('\nIs this okay?')) {
  configsAdapter.updateAwsSettings(newAwsSettings);
  console.log('AWS Settings Updated');
}
