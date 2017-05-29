//------------------------------------------------------------------------------
// External Dependencies
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

//------------------------------------------------------------------------------
// Lib Dependencies
const configsAdapter = require('../configs-adapter');
const utils = require('../utilities');
const Mailbox = require('../gmail/Mailbox');

//------------------------------------------------------------------------------
// Configurations
const dbSettings = configsAdapter.loadDatabaseSettings();

//------------------------------------------------------------------------
// Models
const Mapping = require('./models/Mapping');

//------------------------------------------------------------------------
// Connect Promise
const connectPromise = new Promise((fulfill, reject) => {
  mongoose.connect(dbSettings.database_url, (err) => {
    if (err) reject(err);
    else fulfill();
  });
});

//------------------------------------------------------------------------
// Database#connect
exports.connect = (callback) => {
  //-------------------------
  return utils.wrapAPI(connectPromise, callback);
};

//------------------------------------------------------------------------
// Database#ofMailbox
exports.ofMailbox = (mailbox) => {
  //------------------------------------------------------------------------
  const mailboxId = (mailbox instanceof Mailbox) ? mailbox.name : mailbox;

  //------------------------------------------------------------------------
  const mailboxDb = {};

  //------------------------------------------------------------------------
  // Mailbox#findReplySourceMapping
  mailboxDb.findReplySourceMapping = (message, callback) => {
    //-------------------------
    const promise = new Promise((fulfill, reject) => {
      Mapping
        .findOne({
          mailboxId : mailboxId,
          threadId  : message.threadId,
          messageId : { $ne: message.id },
          issueId   : { $exists: true, $ne: null },
        })
        .exec((err, mapping) => {
          if (err) reject(err);
          else fulfill(mapping);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
  };

  //------------------------------------------------------------------------
  // Mailbox#findDuplicatedMapping
  mailboxDb.findDuplicatedMapping = (message, callback) => {
    //-------------------------
    const promise = new Promise((fulfill, reject) => {
      Mapping
        .findOne({
          mailboxId   : mailboxId,
          threadId    : message.threadId,
          messageId   : { $ne: message.id },
          contentHash : message.contentHash,
        })
        .exec((err, mapping) => {
          if (err) reject(err);
          else fulfill(mapping);
        });
    });
    //-------------------------
    return utils.wrapAPI(promise, callback);
  };

  //------------------------------------------------------------------------
  // Mailbox#createMapping
  mailboxDb.createMapping = (message, callback) => {
    const promise = new Promise((fulfill, reject) => {
      const mapping = new Mapping({
        mailboxId   : mailboxId,
        messageId   : message.id,
        threadId    : message.threadId,
        contentHash : message.contentHash,
      });
      mapping.save((err) => {
        if (err) reject(err);
        else fulfill(mapping);
      });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
  };

  //------------------------------------------------------------------------
  // Mailbox#getMapping
  mailboxDb.getMapping = (message, callback) => {
    //-------------------------
    const promise = new Promise((fulfill, reject) => {
      Mapping
        .findOne({
          mailboxId : mailboxId,
          messageId : message.id,
          threadId  : message.threadId,
        })
        .exec((err, mapping) => {
          if (err) reject(err);
          else fulfill(mapping);
        });
    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
  };

  //------------------------------------------------------------------------
  // Mailbox#updateMapping
  mailboxDb.updateMapping = (message, callback) => {
    //-------------------------
    const promise = new Promise((fulfill, reject) => {
      Mapping
        .findOne({
          mailboxId : mailboxId,
          messageId : message.id,
          threadId  : message.threadId,
        })
        .exec((err, mapping) => {
          if (err) return reject(err);
          mapping.issueId = message.issueId;
          mapping.issueKey = message.issueKey;
          mapping.commentId = message.commentId;
          mapping.save((err2) => {
            if (err2) return reject(err2);
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
