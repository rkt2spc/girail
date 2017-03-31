//========================================================================================================
// External Dependencies
var async = require('async');
var lodash = require('lodash');
var google = require('googleapis');

//========================================================================================================
// Lib Dependencies
var configsAdapter = require('../configs-adapter');
var utils = require('../utilities');
var Mailbox = require('./Mailbox');

//========================================================================================================
// Errors Definitions

//========================================================================================================
// Configurations
var mailboxSettings = configsAdapter.loadMailboxSettings();

//========================================================================================================
// Gmail Service

//========================================================================================================
// Create new Mailbox instance
exports.generateMailboxes = function () {

    var mailboxes = lodash.chain(mailboxSettings)
        .filter('active')
        .map((s) => new Mailbox(s))
        .value();

    //-------------------------   
    return mailboxes;
};