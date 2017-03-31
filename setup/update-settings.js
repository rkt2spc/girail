var utils = require('../lib/utilities');
var setupGmail = require('./mailbox.setup');
var setupJira = require('./jira.setup');

Promise.resolve()
    .then(setupGmail)
    .then(utils.logStatus('Mailbox setup', 'Done'))
    .catch((err) => console.log('Failed to setup mailbox:', err.message))
    .then(setupJira)
    .then(utils.logStatus('Jira setup', 'Done'))
    .catch((err) => console.log('Failed to setup Jira:', err.message));