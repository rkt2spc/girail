//------------------------------------------------------------------------------
// Node Dependencies
const crypto = require('crypto');

//------------------------------------------------------------------------------
// External Dependencies
const async = require('async');
const lodash = require('lodash');

//------------------------------------------------------------------------------
// Lib Dependencies
const utils = require('./utilities');
const database = require('./database');
const gmail = require('./gmail');
const jira = require('./jira');
const logger = require('./logger').consumerLogger;

//------------------------------------------------------------------------------
// Configurations

//------------------------------------------------------------------------------
// Errors
const RecoverableError = require('./errors').RecoverableError;
const UnrecoverableError = require('./errors').UnrecoverableError;
const DropSignal = require('./errors').DropSignal;
const RequeueSignal = require('./errors').RequeueSignal;

//------------------------------------------------------------------------------
// Mailboxes
const mailboxes = lodash.keyBy(gmail.generateMailboxes(), 'name');

//------------------------------------------------------------------------------
// Assign message mailbox
exports.assignMessageMailbox = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!message.mailbox) {
      return reject(new DropSignal({
        code    : 'DS001',
        message : 'Core#assignMessageMailbox: Invalid message, no designated mailbox',
        info    : {
          messageId          : message.id,
          supportedMailboxes : lodash.keys(mailboxes),
        },
      }));
    }

    //-------------------------
    const mailbox = mailboxes[message.mailbox];
    if (!mailbox) {
      return reject(new DropSignal({
        code    : 'DS002',
        message : 'Core#assignMessageMailbox: Invalid message, invalid designated mailbox',
        info    : {
          messageId          : message.id,
          mailbox            : message.mailbox,
          supportedMailboxes : lodash.keys(mailboxes),
        },
      }));
    }

    //-------------------------
    message.mailbox = mailbox;
    fulfill(message);
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Get message details from simple metadata
exports.getMessageDetails = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    message
      .mailbox
      .getMessage(message.id, (err, details) => {
        if (err) {
          return reject(new RecoverableError({
            code    : 'RE001',
            message : 'Core#getMessageDetails: Failed to get message details',
            src     : err,
            info    : {
              messageId : message.id,
              mailbox   : message.mailbox.name,
            },
          }));
        }

        Object.assign(message, details);
        fulfill(message);
      });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Format Gmail Messages to easy to work with structure
exports.formatMessage = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    // Transformed Message Structure
    const transformedMessage = {
      mailbox   : message.mailbox,
      id        : message.id,
      threadId  : message.threadId,
      labelIds  : message.labelIds,
      historyId : message.historyId,

      type        : 'standard',
      cc          : [],
      senders     : [],
      receivers   : [],
      subject     : '',
      content     : '',
      contentHash : '',
      attachments : [],

      metadata : {},
      headers  : {},
    };

    //-------------------------
    // Parse headers
    const headers = lodash
      .chain(message.payload.headers)
      .keyBy('name')
      .mapValues('value')
      .mapKeys((v, k) => lodash.toLower(k))
      .value();

    transformedMessage.headers = headers;

    //-------------------------
    // Format Subject
    if (headers.subject) transformedMessage.subject = headers.subject;

    //-------------------------
    // Format receivers
    if (headers.cc) transformedMessage.receivers = utils.extractEmails(headers.cc);
    if (headers.to) transformedMessage.receivers = transformedMessage.receivers.concat(utils.extractEmails(headers.to));

    //-------------------------
    // Format sender
    if (headers.from) transformedMessage.senders = utils.extractEmails(headers.from);

    //-------------------------
    // Format message content
    if (!message.payload.mimeType.includes('multipart')) {
      // Not a multipart-message
      transformedMessage.content = Buffer.from(message.payload.body.data, 'base64').toString();
    } else {
      // Is a multipart-message Get parts and flatten 2 level deep
      let parts = message.payload.parts;
      parts = lodash.flatMapDeep(parts, (p) => {
        return p.mimeType.includes('multipart') ? p.parts : p;
      });
      parts = lodash.flatMapDeep(parts, (p) => {
        return p.mimeType.includes('multipart') ? p.parts : p;
      });

      //-------------------------
      // Get Message content and attachments
      transformedMessage.content = '';
      transformedMessage.attachments = [];
      parts.forEach((p) => {
        if (!p.body.attachmentId && p.body.data && p.mimeType === 'text/plain') {
          transformedMessage.content += Buffer.from(p.body.data, 'base64').toString();
        } else if (p.filename && p.body.attachmentId) {
          transformedMessage.attachments.push({ mimeType: p.mimeType, filename: p.filename, id: p.body.attachmentId });
        }
      });
    }

    //-------------------------
    // Normalizing message
    if (!transformedMessage.subject || transformedMessage.subject.trim().length === 0) transformedMessage.subject = 'Untitled';
    else transformedMessage.subject = transformedMessage.subject.trim();

    if (!transformedMessage.content || transformedMessage.content.trim().length === 0) transformedMessage.content = 'No content';
    else transformedMessage.content = transformedMessage.content.trim();


    //-------------------------
    fulfill(transformedMessage);
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Check message based on company policies (Sender)
exports.checkMessage = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    const mailbox = message.mailbox;

    //-------------------------
    if (mailbox.whitelist && lodash.intersection(mailbox.whitelist, message.senders).length < message.senders.length) {
      return reject(new DropSignal({
        code    : 'DS003',
        message : 'Core#checkMessage: Message was from unauthorized sender, un-whitelisted',
        info    : {
          messageId          : message.id,
          mailbox            : message.mailbox.name,
          senders            : message.senders,
          whitelistedSenders : mailbox.whitelist,
        },
      }));
    }

    //-------------------------
    if (mailbox.blacklist && lodash.intersection(mailbox.blacklist, message.senders).length > 0) {
      return reject(new DropSignal({
        code    : 'DS004',
        message : 'Core#checkMessage: Message was from unauthorized sender, blacklisted',
        info    : {
          messageId          : message.id,
          mailbox            : message.mailbox.name,
          senders            : message.senders,
          blacklistedSenders : mailbox.blacklist,
        },
      }));
    }

    //-------------------------
    fulfill(message);
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Check whether a message is type of reply or foward/standard
exports.categorizeMessage = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    if (!message.headers['in-reply-to'] && !message.headers.references) {
      //-------------------------
      // Message is a standard message
      message.type = 'standard';
      fulfill(message);
    } else {
      //-------------------------
      // Message either a reply or a forwarded message
      message
        .mailbox
        .getThread(message.threadId, (err, thread) => {
          if (err) {
            return reject(new RecoverableError({
              code    : 'RE002',
              message : 'Core#categorizeMessage: Failed to get message thread',
              src     : err,
              info    : {
                messageId : message.id,
                threadId  : message.threadId,
                mailbox   : message.mailbox.name,
              },
            }));
          }

          //-------------------------
          const threadMessages = thread.messages.map(t => t.id);

          //-------------------------
          if (threadMessages.indexOf(message.id) > 0) {
            // Message is a reply
            message.type = 'reply';
          } else {
            // Message is forwarded
            message.type = 'standard';
            message.subject = message.subject.replace(/Fwd: /g, '');
          }

          //-------------------------
          fulfill(message);
        });
    }
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Assign message project based on CC
exports.assignMessageProject = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    const mailbox = message.mailbox;

    //-------------------------
    // Primary mapping selection method
    const project = mailbox.projects.find((proj) => lodash.intersection(message.receivers, proj.receivers).length === proj.receivers.length);

    //-------------------------
    if (!project) {
      return reject(new DropSignal({
        code    : 'DS005',
        message : 'Core#assignMessageProject: Can\'t find appropriate project for designated receivers',
        info    : {
          messageId : message.id,
          mailbox   : message.mailbox.name,
          receivers : message.receivers,
        },
      }));
    }

    //-------------------------
    message.project = project;

    //-------------------------
    fulfill(message);
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Remove message extra contents like quotes, signature
exports.removeMessageExtras = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    // Remove Gmail Extra
    message.content = message.content.replace(/(^\w.+:\r?\n)?(^>.*(\r?\n|$))+/gm, ''); // Reply Quotes
    message.content = message.content.replace(/(\r?\n)+-- *\r?\n[^]+$/g, ''); // Signature
    message.content = message.content.replace(/(\r?\n)+(-+ *Forwarded message *-+)\r?\n(.+\r?\n)+/gm, ''); // Forward notice

    //-------------------------
    // Remove Outlook Extra
    message.content = message.content.replace(/________________________________ *\r?\n(.+:.+\r?\n)+/g, ''); // Reply Quotes, foward

    //-------------------------
    fulfill(message);
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Create message hash
exports.createMessageHash = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    message.contentHash = crypto
      .createHash('sha512')
      .update(message.content)
      .digest('base64');

    //-------------------------
    fulfill(message);
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Prevent replication
exports.preventMessageReplication = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (message.type === 'standard') return fulfill(message);

    //-------------------------
    database
      .ofMailbox(message.mailbox)
      .findDuplicatedMapping(message, (err, mapping) => {
        //-------------------------
        if (err) {
          return reject(new RecoverableError({
            code    : 'RE003',
            message : 'Core#preventMessageReplication: Failed to read mappings',
            src     : err,
            info    : {
              messageId : message.id,
              mailbox   : message.mailbox.name,
            },
          }));
        }

        //-------------------------
        if (mapping) {
          return reject(new DropSignal({
            code    : 'DS006',
            message : 'Core#preventMessageReplication: Message was duplicated',
            info    : {
              messageId   : message.id,
              mailbox     : message.mailbox.name,
              duplicateId : mapping.messageId,
            },
          }));
        }

        return fulfill(message);
      });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Extract message metadata for Jira custom fields
exports.extractMessageMetadata = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (message.type !== 'standard') return fulfill(message);

    //-------------------------
    let metadata = message.content.match(/_______________ *\r?\n(.+\r?\n?)+/g);
    metadata = lodash
      .chain(metadata)
      .flatMapDeep(m => m.match(/[^\r\n]+/g))
      .map(m => m.split(/ *: */g))
      .filter(m => m.length >= 2)
      .keyBy('0')
      .mapValues('1')
      .value();

    //-------------------------
    message.metadata = metadata;

    //-------------------------
    fulfill(message);
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Register mapping, make sure no dup passed
exports.registerMapping = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    database
      .ofMailbox(message.mailbox)
      .createMapping(message, (err, mapping) => {
        //-------------------------
        if (err && err.code !== 11000) {
          //-------------------------
          // Natural disaster (Network failure blah blah)
          reject(new RecoverableError({
            code    : 'RE004',
            message : 'Core#registerMapping: Failed to create message mapping',
            src     : err,
            info    : {
              messageId : message.id,
              mailbox   : message.mailbox.name,
            },
          }));
        } else if (err && err.code === 11000) {
          //-------------------------
          // Message existed -> Check if message already mapped to a Jira entity
          database
            .ofMailbox(message.mailbox)
            .getMapping(message, (err2, mapping2) => {
              //-------------------------
              if (err2) {
                return reject(new RecoverableError({
                  code    : 'RE005',
                  message : 'Core#registerMapping: Failed to get message mapping',
                  src     : err2,
                  info    : {
                    messageId : message.id,
                    mailbox   : message.mailbox.name,
                  },
                }));
              }

              //-------------------------
              // Message wasn't mapped to any Jira entity, could be a result of re-enqueue, or
              // retry of recoverable error
              if (!mapping2.issueId && !mapping2.issueKey) return fulfill(message);

              //-------------------------
              // Message already associated with a Jira entity
              reject(new DropSignal({
                code    : 'DS007',
                message : 'Core#registerMapping: Message was already processed',
                src     : err,
                info    : {
                  messageId : message.id,
                  mailbox   : message.mailbox.name,
                },
              }));
            });
        } else {
          //-------------------------
          // Message doesn't exist
          fulfill(message);
        }
      });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Create Jira Issue
exports.createJiraIssue = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    jira.createIssue(message, (err, issue) => {
      if (err) {
        return reject(new RecoverableError({
          code    : 'RE006',
          message : 'Core#createJiraIssue: Failed to create Jira Issue',
          src     : err,
          info    : {
            messageId : message.id,
            mailbox   : message.mailbox.name,
          },
        }));
      }

      //-------------------------
      // Assign Issue
      message.issueId = issue.id;
      message.issueKey = issue.key;

      //-------------------------
      fulfill(message);
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Create Jira Comment
exports.createJiraComment = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    database
      .ofMailbox(message.mailbox)
      .findReplySourceMapping(message, (err, mapping) => {
        //-------------------------
        if (err) {
          return reject(new RecoverableError({
            code    : 'RE007',
            message : 'Core#createJiraComment: Failed to find reply source mapping',
            src     : err,
            info    : {
              messageId : message.id,
              mailbox   : message.mailbox.name,
            },
          }));
        }

        //-------------------------
        // Find reply-source
        if (!mapping) {
          return reject(new RequeueSignal({
            code    : 'RS001',
            message : 'Core#createJiraComment: No reply source mapping. SQS could be sending message out-of-order. Try re-enqueueing',
            src     : err,
            info    : {
              messageId : message.id,
              mailbox   : message.mailbox.name,
            },
          }));
        }

        //-------------------------
        // Assign Reply Source Issue
        message.issueId = mapping.issueId;
        message.issueKey = mapping.issueKey;

        //-------------------------
        // Create comment
        jira.createComment(message, (err2, comment) => {
          if (err2) {
            return reject(new RecoverableError({
              code    : 'RE008',
              message : 'Core#createJiraComment: Failed to create Jira Comment',
              src     : err2,
              info    : {
                messageId : message.id,
                mailbox   : message.mailbox.name,
              },
            }));
          }

          //-------------------------
          message.commentId = comment.id;
          fulfill(message);
        });
      });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Create Jira Entity based on message type
exports.createJiraEntity = (message, callback) => {
  if (message.type === 'reply') utils.wrapAPI(exports.createJiraComment(message), callback);
  else utils.wrapAPI(exports.createJiraIssue(message), callback);
};

//------------------------------------------------------------------------------
// Update mapping
exports.updateMapping = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    database
      .ofMailbox(message.mailbox)
      .updateMapping(message, (err, mapping) => {
        if (err) {
          return reject(new UnrecoverableError({
            code    : 'UE001',
            message : 'Core#updateMapping: Failed to update mapping after creating Jira Entity',
            src     : err,
            info    : {
              messageId     : message.id,
              mailbox       : message.mailbox.name,
              jiraCommentId : message.commentId,
              jiraIssueId   : message.issueId,
              jiraIssueKey  : message.issueKey,
            },
          }));
        }

        fulfill(message);
      });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Upload attachments
exports.uploadAttachments = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (!message.attachments || message.attachments.length === 0) return fulfill(message);

    //-------------------------
    async.eachSeries(message.attachments, (attachment, cb) => {
      message
        .mailbox
        .getAttachment({
          messageId    : message.id,
          attachmentId : attachment.id,
        }, (err, data) => {
          if (err) {
            logger.error(new UnrecoverableError({
              code    : 'UE002',
              message : `Core#uploadAttachments: Failed to download attachment ${attachment.filename}`,
              src     : err,
              info    : {
                messageId    : message.id,
                mailbox      : message.mailbox.name,
                attachmentId : attachment.id,
              },
            }));
            return cb();
          }

          logger.info(`Attachment Buffered ${attachment.filename} (${data.length} Bytes)`);
          jira.uploadAttachment({
            issueId  : message.issueId,
            filename : attachment.filename,
            mimeType : attachment.mimeType,
            data     : data,
          }, (err2) => {
            if (err2) {
              logger.error(new UnrecoverableError({
                code    : 'UE003',
                message : `Core#uploadAttachments: Failed to upload attachment ${attachment.filename}`,
                src     : err2,
                info    : {
                  messageId    : message.id,
                  mailbox      : message.mailbox.name,
                  attachmentId : attachment.id,
                  jiraProject  : message.project.key,
                  jiraIssue    : message.issueKey,
                },
              }));
            } else {
              logger.info(`Attachment Uploaded ${attachment.filename}`);
            }
            cb(null);
          });
        });
    }, (err) => {
      if (err) { return reject(err); }
      fulfill(message);
    });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Mark message processed
exports.markMessageProcessed = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    message
      .mailbox
      .markMessageProcessed(message, (err) => {
        //-------------------------
        if (err) {
          return reject(new UnrecoverableError({
            code    : 'UE004',
            message : 'Core#markMessageProcessed: Failed to mark message processed',
            src     : err,
            info    : {
              messageId : message.id,
              mailbox   : message.mailbox.name,
            },
          }));
        }

        //-------------------------
        fulfill(message);
      });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};

//------------------------------------------------------------------------------
// Successful reply
exports.sendReplyOnIssueCreation = (message, callback) => {
  //-------------------------
  const promise = new Promise((fulfill, reject) => {
    //-------------------------
    if (message.type !== 'standard') return fulfill(message);

    //-------------------------
    message
      .mailbox
      .sendMessage({
        from       : message.mailbox.name,
        to         : message.receivers,
        subject    : message.subject,
        references : message.headers['Message-Id'],
        inReplyTo  : message.headers['Message-Id'],
        threadId   : message.threadId,
        html       : `Thank you for your feedback. Ticket has been created at <a href="https://misfit.jira.com/projects/${message.project.key}/issues/${message.issueKey}">https://misfit.jira.com/projects/${message.project.key}/issues/${message.issueKey}</a>`,
      },
      (err) => {
        if (err) {
          logger.error(new UnrecoverableError({
            code    : 'UE005',
            message : 'Core#sendReplyOnIssueCreation: Failed to send reply message',
            src     : err,
            info    : {
              messageId   : message.id,
              mailbox     : message.mailbox.name,
              jiraProject : message.project.key,
              jiraIssue   : message.issueKey,
            },
          }));
        }

        //-------------------------
        fulfill(message);
      });
  });

  //-------------------------
  return utils.wrapAPI(promise, callback);
};
