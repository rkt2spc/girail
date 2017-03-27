var utils = require('./lib/utilities');
var setupGmail = require('./lib/setup/mailbox.setup');
var setupJira = require('./lib/setup/jira.setup');

Promise.resolve()
    .then(setupGmail)
    .then(utils.logStatus('Mailbox setup', 'Done'))
    .then(setupJira)
    .then(utils.logStatus('Jira setup', 'Done'))
    .catch((err) => console.log('Failed to setup Jira:', err.message));