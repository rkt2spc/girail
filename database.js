//------------------------------------------------------------------------
// Dependencies
var helpers = require('./helpers');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise; //Use native ES6 Promise instead of Mongoose's default

//------------------------------------------------------------------------
// Mongo Configurations
var configs = require('./credentials/database-conf.json');

//------------------------------------------------------------------------
// Models
var Event = require('./models/Event');
var Mapping = require('./models/Mapping');

//------------------------------------------------------------------------
// Database Object
var databaseObject = {

    // Connect to database
    connect: function (callback) {

        var promise = new Promise((fulfill, reject) => {
            mongoose.connect(configs.database_url, (err) => {
                if (err) reject(err);
                else fulfill();
            });
        });

        //-------------------------
        return helpers.wrapAPI(promise, callback);
    },
    disconnect: function (callback) {
        var promise = new Promise((fulfill, reject) => {
            mongoose.disconnect((err) => {
                if (err) reject(err);
                else fulfill();
            });
        });

        //-------------------------
        return helpers.wrapAPI(promise, callback);
    },

    /**********************************************************************
    * Database APIs                                                       *
    **********************************************************************/
    // Event APIs
    getLatestEvent: function (callback) {
        // historyId is an index, no sorting really happen
        // automatically optimize under mongodb
        Event
            .find()
            .sort({ historyId: -1 })
            .limit(1)
            .exec((err, results) => {
                if (err) return callback(err);
                if (results.length === 0) return callback(null, null);
                callback(null, results[0]);
            });
    },
    addNewEvent: function (params, callback) {
        var event = new Event({
            historyId: params.historyId
        });

        event.save((err) => {
            if (err) return callback(err);
            callback(null, event);
        });
    },

    // Message APIs
    markMessageProcessing: function (message, callback) {
        var mapping = new Mapping({
            messageId: message.id
        });

        mapping.save((err) => {
            if (err) return callback(err);
            callback(null, mapping);
        });
    },
    updateMessageMapping: function (message, callback) {
        Mapping
            .findOne({ messageId: message.id })
            .exec((err, mapping) => {
                if (err) return callback(err);
                if (!mapping) return callback(new Error('No mapping found'));

                mapping.emailId = message.emailId;
                if (message.issue) {
                    mapping.issueId = message.issue.id;
                    mapping.issueKey = message.issue.key;
                }

                if (message.comment)
                    mapping.commentid = message.comment.id;

                mapping.save((e) => {
                    if (e) return callback(e);
                    callback(null, mapping);
                });
            });
    },
    getReplyMessageIssue: function (message, callback) {
        Mapping
            .findOne({ emailId: message.rootReply })
            .exec((err, mapping) => {
                if (err) return callback(err);
                if (!mapping) return callback(new Error('No mapping found for message rootReply'));

                callback(null, { id: mapping.issueId, key: mapping.issueKey });
            });
    }
};

//------------------------------------------------------------------------
// Exports
module.exports = databaseObject;