//========================================================================================================
// Dependencies
var helpers = require('./helpers');
var setupGmail = require('./setup/gmail-setup');
var setupJira = require('./setup/jira-setup');

//========================================================================================================
// Setup chain
Promise.resolve()
    .then(() => setupGmail())
    .then(() => setupJira())
    .then(helpers.log('Setup completed...'))
    .catch((err) => {
        console.log(err);
    });
