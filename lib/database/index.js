//========================================================================================================
// External Dependencies
var lodash = require('lodash');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

//========================================================================================================
// Lib Dependencies
var configsAdapter = require('../configs-adapter');
var utils = require('../utilities');
var Mailbox = require('../gmail/Mailbox');

//========================================================================================================
// Configurations
var dbSettings = configsAdapter.loadDatabaseSettings();

//------------------------------------------------------------------------
// Models
var Mapping = require('./models/Mapping');

//------------------------------------------------------------------------
var connectPromise = new Promise((fulfill, reject) => {
    mongoose.connect(dbSettings.database_url, (err) => {
        if (err) reject(err);
        else fulfill();
    });
});

//------------------------------------------------------------------------
exports.connect = function (callback) {

    //-------------------------    
    return utils.wrapAPI(connectPromise, callback);
};

//------------------------------------------------------------------------
exports.ofMailbox = function (mailbox) {

    //------------------------------------------------------------------------    
    var mailboxId = (mailbox instanceof Mailbox) ? mailbox.name : mailbox;

    //------------------------------------------------------------------------    
    var mailboxDb = {};

    //------------------------------------------------------------------------
    // Find message reply source
    mailboxDb.findReplySourceMapping = function (message, callback) {
        var promise = new Promise((fulfill, reject) => {
            Mapping
                .findOne({
                    mailboxId: mailboxId,
                    threadId: message.threadId,
                    messageId: { $ne: message.id },
                    issueId: { $exists: true, $ne: null }
                })
                .exec((err, mapping) => {
                    if (err) return reject(err);
                    fulfill(mapping);
                });
        });

        //-------------------------
        return utils.wrapAPI(promise, callback);
    };

    //------------------------------------------------------------------------
    // Find Duplicated Mapping
    mailboxDb.findDuplicatedMapping = function (message, callback) {
        var promise = new Promise((fulfill, reject) => {
            Mapping
                .findOne({
                    mailboxId: mailboxId,
                    threadId: message.threadId,
                    messageId: { $ne: message.id },
                    contentHash: message.contentHash
                })
                .exec((err, mapping) => {

                    if (err) return reject(err);
                    fulfill(mapping);
                });
        });

        //-------------------------
        return utils.wrapAPI(promise, callback);
    };

    //------------------------------------------------------------------------
    // Create new mapping form message
    mailboxDb.createMapping = function (message, callback) {
        var promise = new Promise((fulfill, reject) => {
            var mapping = new Mapping({
                mailboxId: mailboxId,
                messageId: message.id,
                threadId: message.threadId,
                contentHash: message.contentHash
            });

            mapping.save((err) => {
                if (err) return reject(err);
                fulfill(mapping);
            });
        });

        //-------------------------
        return utils.wrapAPI(promise, callback);
    };

    //------------------------------------------------------------------------
    mailboxDb.getMapping = function (message, callback) {
        var promise = new Promise((fulfill, reject) => {
            Mapping
                .findOne({
                    mailboxId: mailboxId, 
                    messageId: message.id,
                    threadId: message.threadId
                })
                .exec((err, mapping) => {
                    if (err) return reject(err);
                    fulfill(mapping);
                });
        });

        //-------------------------
        return utils.wrapAPI(promise, callback);
    };

    //------------------------------------------------------------------------
    mailboxDb.updateMapping = function (message, callback) {
        var promise = new Promise((fulfill, reject) => {
            Mapping
                .findOne({
                    mailboxId: mailboxId, 
                    messageId: message.id, 
                    threadId: message.threadId 
                })
                .exec((err, mapping) => {
                    if (err) return reject(err);

                    mapping.issueId = message.issueId;
                    mapping.issueKey = message.issueKey;
                    mapping.commentId = message.commentId;
                    mapping.save((err) => {
                        if (err) return reject(err);
                        fulfill(mapping);
                    });
                });
        });

        //-------------------------
        return utils.wrapAPI(promise, callback);
    };

    //------------------------------------------------------------------------
    return mailboxDb;
};