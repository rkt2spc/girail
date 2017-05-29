/* eslint no-console: off */

//------------------------------------------------------------------------------
// Node Dependencies

//------------------------------------------------------------------------------
// External Dependencies
const yargs = require('yargs');
const readlineSync = require('readline-sync');

//------------------------------------------------------------------------------
// Lib Dependencies
const configsAdapter = require('../lib/configs-adapter');

//------------------------------------------------------------------------------
// Configurations
const mailboxSettings = configsAdapter.loadMailboxSettings();

//------------------------------------------------------------------------------
// Arguments
const argv = yargs
    .usage('Usage: $0 -m [mailbox]')
    .help('h')
    .alias('h', 'help')
    .demandOption(['mailbox'])
    .example('$0 --mailbox foo@mail.com')
    .alias('m', 'mailbox')
    .describe('m', 'The mail box you want removed')
    .argv;

//------------------------------------------------------------------------------
console.log('\n===================================================');
const mailbox = mailboxSettings.find((mb) => mb.name === argv.mailbox);

if (!mailbox) {
  console.log('No mailbox found with given name:', argv.mailbox);
  console.log('Available mailboxes are:', mailboxSettings.map((mb) => mb.name));
  process.exit(1);
}

if (readlineSync.keyInYN(`Are you sure you want to remove mailbox <${mailbox.name}>?`)) {
  mailboxSettings.splice(mailboxSettings.indexOf(mailbox), 1);
  configsAdapter.updateMailboxSettings(mailboxSettings);
  console.log(`Mailbox <${argv.mailbox}> removed`);
} else {
  console.log('Cancelled');
}
