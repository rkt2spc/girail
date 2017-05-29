//------------------------------------------------------------------------------
// External Dependencies
const lodash = require('lodash');

//------------------------------------------------------------------------------
// Lib Dependencies
const configsAdapter = require('../configs-adapter');
const Mailbox = require('./Mailbox');

//------------------------------------------------------------------------------
// Errors Definitions

//------------------------------------------------------------------------------
// Configurations
const mailboxSettings = configsAdapter.loadMailboxSettings();

//------------------------------------------------------------------------------
// Gmail Service

//------------------------------------------------------------------------------
// Create new Mailbox instance
exports.generateMailboxes = () => {
  const mailboxes = lodash
    .chain(mailboxSettings)
    .filter('active')
    .map((s) => new Mailbox(s))
    .value();

  //-------------------------
  return mailboxes;
};
