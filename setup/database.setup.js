/* eslint no-console: off */

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
console.log('\n\nInitializing Database setup...');
console.log('======================================================');

//-------------------------
const newDatabaseSettings = {
  database_url: '',
};
newDatabaseSettings.database_url = readlineSync.question('Enter your Mongo Database Url (default mongodb://localhost/default-db): ');
if (!newDatabaseSettings.database_url) { newDatabaseSettings.database_url = 'mongodb://localhost/default-db'; }


console.log('======================================================');
console.log('Review your Database settings:');
console.log(nativeUtil.inspect(newDatabaseSettings));

if (readlineSync.keyInYN('\nIs this okay?')) {
  configsAdapter.updateDatabaseSettings(newDatabaseSettings);
  console.log('Database Settings Updated');
}
