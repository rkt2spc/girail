//------------------------------------------------------------------------
// Dependencies
var helpers = require('./helpers');
var AppError = requrire('./errors/AppError.js');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise; //Use native ES6 Promise instead of Mongoose's default

//------------------------------------------------------------------------
// Mongo Configurations
var configs = require('./credentials/database-conf.json');

//------------------------------------------------------------------------
// Models
var Mapping = require('./models/Mapping');

//------------------------------------------------------------------------
var connectPromise = new Promise((fulfill, reject) => {
    mongoose.connect('mongodb://localhost/test-db', (err) => {
        if (err) reject(err);
        else fulfill();
    });
});

//------------------------------------------------------------------------
exports.connect = function (callback) {

    //-------------------------    
    return helpers.wrapAPI(connectPromise, callback);
};

//------------------------------------------------------------------------
exports.findReplySourceMapping = function (replyMessage, callback) {

    var promise = new Promise((fulfill, reject) => {
        Mapping
            .findOne({ threadId: replyMessage.threadId, issueId: { $exists: true, $ne: null } })
            .exec((err, mapping) => {
                if (err) return reject(err);
                if (!mapping)
                    return reject(new AppError({ code: 0, name: 'Empty Entry', message: 'Reply Source Unavailable'}));
                
                fulfill(mapping);
            });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------
exports.createMapping = function (message, callback) {

    var promise = new Promise((fulfill, reject) => {
        var mapping = new Mapping({
            messageId: message.id,
            threadId: message.threadId
        });

        mapping.save((err) => {
            if (err) return reject(err);
            fulfill(mapping);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------
exports.updateMapping = function (message, callback) {

    var promise = new Promise((fulfill, reject) => {
        Mapping
            .findOne({ messageId: message.id, threadId: message.threadId })
            .exec((err, mapping) => {
                if (err) return reject(err);

                // if (!mapping) // TO_DO


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
    return helpers.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------
exports.getMapping = function (message, callback) {

    var promise = new Promise((fulfill, reject) => {
        Mapping
            .findOne({ messageId: message.id, threadId: message.threadId })
            .exec((err, mapping) => {
                if (err) return reject(err);
                fulfill(mapping);
            });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};