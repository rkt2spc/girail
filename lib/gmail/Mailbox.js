/* eslint dot-notation: off */

//------------------------------------------------------------------------------
// External Dependencies
const async = require('async');
const google = require('googleapis');
const base64url = require('base64url');
const composeMail = require('mailcomposer');

//------------------------------------------------------------------------------
// Lib Dependencies
const configsAdapter = require('../configs-adapter');
const utils = require('../utilities');

//------------------------------------------------------------------------------
// Errors Definitions
const LogicError = require('../errors').LogicError;

//------------------------------------------------------------------------------
// Configurations
const gmailSettings = configsAdapter.loadGmailSettings();
const googleCredentials = configsAdapter.loadGoogleCredentials();

//------------------------------------------------------------------------------
// Gmail Service
function Mailbox(settings) {
  //-------------------------
  const tokens = JSON.parse(Buffer.from(settings.tokens, 'base64').toString('utf8'));

  //-------------------------
  const oauth2Client = new google.auth.OAuth2(
      googleCredentials.installed.client_id,
      googleCredentials.installed.client_secret,
      googleCredentials.installed.redirect_uris[0]
  );
  oauth2Client.setCredentials(tokens);

  //-------------------------
  Object.assign(this, settings);
  this.gmailService = google.gmail({
    version : 'v1',
    auth    : oauth2Client,
  });
}

//------------------------------------------------------------------------------
// Retrieve all unprocessed messages
Mailbox.prototype.retrieveUnprocessedMessages = function retrieveUnprocessedMessages(callback) {
  const self = this;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    self.gmailService.users.messages.list({
      userId   : 'me',
      labelIds : [self.labels['Unprocessed']],
    }, (err, response) => {
      if (err) return reject(err);
      // No new messages
      if (!response.messages || response.messages.length <= 0) return fulfill([]);
      // Have new messages
      fulfill(response.messages);
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Mark messages enqueued
Mailbox.prototype.markMessageEnqueued = function markMessageEnqueued(message, callback) {
  const self = this;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!message || !message.id) {
      return reject(new LogicError({
        code    : 'LE001',
        message : 'Gmail#markMessageEnqueued: Invoked with invalid parameter',
        info    : { message },
      }));
    }

    //-------------------------
    self.gmailService.users.messages.modify({
      // Modify params
      userId   : 'me',
      id       : message.id,
      resource : {
        addLabelIds    : [self.labels['Enqueued']],
        removeLabelIds : [self.labels['Unprocessed']],
      },
    },
    // Callback
    (err) => {
      if (err) reject(err);
      else fulfill();
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Mark messages enqueued
Mailbox.prototype.markMessageProcessed = function markMessageProcessed(message, callback) {
  const self = this;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!message || !message.id) {
      return reject(new LogicError({
        code    : 'LE002',
        message : 'Gmail#markMessageProcessed: Invoked with invalid parameter',
        info    : { message },
      }));
    }
    //-------------------------
    self.gmailService.users.messages.modify(
      // Modify params
      {
        userId   : 'me',
        id       : message.id,
        resource : {
          addLabelIds    : [self.labels['Processed']],
          removeLabelIds : [self.labels['Enqueued']],
        },
      },
      // Callback
      (err) => {
        if (err) reject(err);
        else fulfill();
      }
    );
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Mark messages Unprocessible
Mailbox.prototype.markMessageUnprocessible = function markMessageUnprocessible(message, callback) {
  const self = this;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!message || !message.id) {
      return reject(new LogicError({
        code    : 'LE003',
        message : 'Gmail#markMessageUnprocessible: Invoked with invalid parameter',
        info    : { message },
      }));
    }

    //-------------------------
    self.gmailService.users.messages.modify({
      // Modify params
      userId   : 'me',
      id       : message.id,
      resource : {
        addLabelIds    : [self.labels['Unprocessible']],
        removeLabelIds : [self.labels['Enqueued'], self.labels['Unprocessed']],
      },
    },
    // Callback
    (err) => {
      if (err) reject(err);
      else fulfill();
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Get detailed Gmail Message
Mailbox.prototype.getMessage = function getMessage(messageId, callback) {
  const gmailService = this.gmailService;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!messageId) {
      return reject(new LogicError({
        code    : 'LE004',
        message : 'Gmail#getMessage: Invoked with invalid parameter',
        info    : { messageId },
      }));
    }

    //-------------------------
    gmailService.users.messages.get({
      // get params
      userId          : 'me',
      id              : messageId,
      format          : 'full',
      metadataHeaders : gmailSettings.METADATA_HEADERS,
    },
    // Callback
    (err, message) => {
      if (err) reject(err);
      else fulfill(message);
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Get detailed Gmail Message
Mailbox.prototype.getThread = function getThread(threadId, callback) {
  const gmailService = this.gmailService;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!threadId) {
      return reject(new LogicError({
        code    : 'LE005',
        message : 'Gmail#getThread: Invoked with invalid parameter',
        info    : { threadId },
      }));
    }
    //-------------------------
    gmailService.users.threads.get({
      // get params
      userId : 'me',
      id     : threadId,
      format : 'minimal',
      fields : 'messages(id)',
    },
    // Callback
    (err, thread) => {
      if (err) reject(err);
      else fulfill(thread);
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Get a message attachment
Mailbox.prototype.getAttachment = function getAttachment(params, callback) {
  const gmailService = this.gmailService;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!params || !params.messageId || !params.attachmentId) {
      return reject(new LogicError({
        code    : 'LE006',
        message : 'Gmail#getAttachment: Invoked with invalid parameter',
        info    : { params },
      }));
    }

    //-------------------------
    gmailService.users.messages.attachments.get({
      userId    : 'me',
      messageId : params.messageId,
      id        : params.attachmentId,
    }, (err, response) => {
      if (err) return reject(err);
      fulfill(Buffer.from(response.data, 'base64'));
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Send message
Mailbox.prototype.sendMessage = function sendMessage(params, callback) {
  const gmailService = this.gmailService;

  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    async.waterfall([
      //-------------------------
      (next) => {
        composeMail({
          from       : params.from,
          to         : params.to,
          subject    : params.subject,
          references : params.references,
          inReplyTo  : params.inReplyTo,
          text       : params.text,
          html       : params.html,
        })
        .build((err, mail) => next(err, mail));
      },
      //-------------------------
      (mail, next) => {
        next(null, base64url.encode(mail));
      },
      //-------------------------
      (encodedMail, next) => {
        gmailService.users.messages.send({
          userId   : 'me',
          resource : {
            raw      : encodedMail,
            threadId : params.threadId,
          },
        }, (err, successResponse) => next(err, successResponse));
      },
    //-------------------------
    ], (err, result) => {
      if (err) reject(err);
      else fulfill(result);
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Exports
module.exports = Mailbox;
