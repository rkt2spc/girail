//------------------------------------------------------------------------------
// External Dependencies
const lodash = require('lodash');

//------------------------------------------------------------------------------
// Lib Dependencies
const utils = require('./lib/utilities');
const database = require('./lib/database');
const core = require('./lib/core');
const queue = require('./lib/queue');
const logger = require('./lib/logger').consumerLogger;

//------------------------------------------------------------------------------
// Errors
const RecoverableError = require('./lib/errors').RecoverableError;
const UnrecoverableError = require('./lib/errors').UnrecoverableError;
const DropSignal = require('./lib/errors').DropSignal;
const RequeueSignal = require('./lib/errors').RequeueSignal;

//------------------------------------------------------------------------------
const Consumer = require('sqs-consumer');
const app = Consumer.create({
  sqs                        : queue.sqsService,
  queueUrl                   : queue.url,
  visibilityTimeout          : 1800,
  waitTimeSeconds            : 20,
  terminateVisibilityTimeout : true,
  handleMessage              : (message, done) => {
    //-------------------------
    if (!message || !message.Body) {
      logger.info('Consuming messages...');
      return done();
    }

    //-------------------------
    const gmailMessage = JSON.parse(message.Body);
    logger.info('======================================================');
    logger.info(`Processing message <${gmailMessage.mailbox}>: ${gmailMessage.id}`);
    database.connect()
      .then(() => Promise.resolve(lodash.cloneDeep(gmailMessage)))
      //-----------------------------------------------------------------
      .then(core.assignMessageMailbox)
      .then(utils.logStatus('Assign message mailbox', 'Done'))
      //-----------------------------------------------------------------
      .then(core.getMessageDetails)
      .then(utils.logStatus('Get message details', 'Done'))
      //-----------------------------------------------------------------
      .then(core.formatMessage)
      .then(utils.logStatus('Format message', 'Done'))
      //-----------------------------------------------------------------
      .then(core.checkMessage)
      .then(utils.logStatus('Check message', 'Done'))
      //-----------------------------------------------------------------
      .then(core.categorizeMessage)
      .then(utils.logStatus('Categorize message', 'Done'))
      //-----------------------------------------------------------------
      .then(core.assignMessageProject)
      .then(utils.logStatus('Assign message project', 'Done'))
      //-----------------------------------------------------------------
      .then(core.removeMessageExtras)
      .then(utils.logStatus('Remove message extras', 'Done'))
      //-----------------------------------------------------------------
      .then(core.createMessageHash)
      .then(utils.logStatus('Create message hash', 'Done'))
      //-----------------------------------------------------------------
      .then(core.preventMessageReplication)
      .then(utils.logStatus('Prevent message replication', 'Done'))
      //-----------------------------------------------------------------
      .then(core.extractMessageMetadata)
      .then(utils.logStatus('Extract message metadata', 'Done'))
      //-----------------------------------------------------------------
      .then(core.registerMapping)
      .then(utils.logStatus('Register mapping', 'Done'))
      //-----------------------------------------------------------------
      .then(core.createJiraEntity)
      .then(utils.logStatus('Create Jira entity', 'Done'))
      //-----------------------------------------------------------------
      .then(core.updateMapping)
      .then(utils.logStatus('Update mapping', 'Done'))
      //-----------------------------------------------------------------
      .then(core.uploadAttachments)
      .then(utils.logStatus('Upload attachments', 'Done'))
      //-----------------------------------------------------------------
      .then(core.markMessageProcessed)
      .then(utils.logStatus('Mark message processed', 'Done'))
      //-----------------------------------------------------------------
      .then(() => {
        // No error happened
        logger.info(`Finished processing message ${gmailMessage.id}`);
        done();
      })
      //-----------------------------------------------------------------
      .catch((err) => {
        //-------------------------
        // Recoverable Error
        if (err instanceof RecoverableError) {
          logger.info('Got Recoverable Error:', err.message);
          logger.warn(err);
          return done(err); // Leave message on queue for retrying
        }

        //-------------------------
        // Unrecoverable Error
        if (err instanceof UnrecoverableError) {
          logger.info('Got Unrecoverable Error:', err.message);
          logger.error(err);
          return done(); // Remove the message and do manual recovery based on logs
        }

        //-------------------------
        // Drop Signal
        if (err instanceof DropSignal) {
          logger.info('Got Drop Signal:', err.message);
          logger.warn(err);
          return done(); // Drop message
        }

        //-------------------------
        // Requeue Signal
        if (err instanceof RequeueSignal) {
          logger.info('Got Requeue Signal:', err.message);

          // Requeued too many times
          if (gmailMessage.requeueCount && gmailMessage.requeueCount >= 8) {
            const drop_signal = new DropSignal({
              code    : 'DS008',
              message : `Message have been requeued too many times (${gmailMessage.requeueCount} times)`,
              info    : {
                messageId : gmailMessage.id,
                mailbox   : gmailMessage.mailbox,
              },
            });
            logger.info(drop_signal.message);
            logger.warn(drop_signal);
            return done();
          }

          logger.warn(err);
          if (gmailMessage.requeueCount) gmailMessage.requeueCount++;
          else gmailMessage.requeueCount = 1;
          queue.sendMessage(JSON.stringify(gmailMessage), (sqs_err, data) => {
            if (sqs_err) {
              const recoverable_error = new RecoverableError({
                code    : 'RE009',
                message : 'SQS Failure: Failed to re-enqueue message',
                src     : sqs_err,
                info    : {
                  messageId : gmailMessage.id,
                  mailbox   : gmailMessage.mailbox,
                },
              });

              logger.info(recoverable_error.message);
              logger.warn(recoverable_error);
              return done(recoverable_error);
            }
            return done();
          });
        }
      })
      .catch((e) => {
        logger.error('WTF:', e);
        done(e);
      });
  },
});

//------------------------------------------------------------------------------
app.on('error', (err) => logger.error(err));
app.on('stopped', () => process.kill(process.pid, 'SIGUSR2'));

//------------------------------------------------------------------------------
logger.info('Consuming messages...');
app.start();

//------------------------------------------------------------------------------
// process.once('SIGINT', () => {
//     logger.info('\nStopping...');
//     app.stop();
// });
process.once('SIGUSR2', () => {
  logger.info('\nStopping...');
  app.stop();
});
