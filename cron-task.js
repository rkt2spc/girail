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
    mailbox.retrieveUnprocessedMessages((retrieve_error, messages) => {
      //-------------------------
      if (retrieve_error) {
        logger.info('Failed to retrieve unprocessed messages');
        logger.error(retrieve_error);
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
        queue.sendMessage(JSON.stringify(message), (enqueue_error, data) => {
          // Can't enqueue
          if (enqueue_error) {
            logger.info('Failed to enqueue message!');
            logger.error(enqueue_error);
            next();
            return;
          }
          logger.info(`Message ${message.id} enqueued`);
          // Mark message enqueued
          mailbox.markMessageEnqueued(message, (mark_error) => {
            if (mark_error) {
              logger.info('Failed to mark message enqueued!');
              logger.error(mark_error);
              next();
              return;
            }
            logger.info(`Message ${message.id} marked as enqueued`);
            next();
          });
        });
      },
      // Final callback
      (process_message_error) => {
        if (process_message_error) logger.error(process_message_error);
        processNextMailbox();
      });
    });
  }, (process_mailbox_error) => {
    if (process_mailbox_error) logger.error(process_mailbox_error);
    cronDone();
  });
};
