module.exports = (cronDone) => {
  //------------------------------------------------------------------------------
  // External Depdendencies
  const async = require('async');

  //------------------------------------------------------------------------------
  // Lib Depdendencies
  const gmail = require('./lib/gmail');
  const queue = require('./lib/queue');
  const logger = require('./lib/logger').cronLogger;

  //------------------------------------------------------------------------------
  // Configurations

  //------------------------------------------------------------------------------
  // Cron process
  const mailboxes = gmail.generateMailboxes();
  logger.info(`Processing ${mailboxes.length} mailboxes`);
  async.eachSeries(mailboxes, (mailbox, processNextMailbox) => {
    //-------------------------
    logger.info('==============================================');
    logger.info(`Processing mailbox <${mailbox.name}>`);
    mailbox.retrieveUnprocessedMessages((err, messages) => {
      //-------------------------
      if (err) {
        logger.info('Failed to retrieve unprocessed messages');
        logger.error(err);
        return processNextMailbox();
      }

      //-------------------------
      if (messages.length === 0) {
        logger.info(`Done, mailbox ${mailbox.name} has nothing to process`);
        return processNextMailbox();
      }

      //-------------------------
      messages.reverse();
      logger.info(`Begin processing ${messages.length} messages`);

      //-------------------------
      // Perform iterating asynchronously
      async.eachSeries(
      // Data source
      messages,
      // Iterating function
      (message, next) => {
        logger.info('--------------------------------------------------');
        logger.info(`Processing message ${message.id}`);
        message.mailbox = mailbox.name;
        queue.sendMessage(JSON.stringify(message), (err, data) => {
          // Can't enqueue
          if (err) {
            logger.info('Failed to enqueue message!')
            logger.error(err);
            next();
            return;
          }
          logger.info(`Message ${message.id} enqueued`);
          // Mark message enqueued
          mailbox.markMessageEnqueued(message, (err) => {
            if (err) {
              logger.info('Failed to mark message enqueued!');
              logger.error(err);
              next();
              return;
            }
            logger.info(`Message ${message.id} marked as enqueued`);
            next();
          });
        });
      },
      // Final callback
      (err2) => {
        if (err2) logger.error(err2);
        processNextMailbox();
      });
    });
  }, (err) => {
    if (err) logger.error(err);
    cronDone();
  });
};
