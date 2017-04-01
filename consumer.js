//========================================================================================================
// External Dependencies
var async = require('async');
var lodash = require('lodash');

//========================================================================================================
// Lib Dependencies
var utils = require('./lib/utilities');
var database = require('./lib/database');
var core = require('./lib/core');
var queue = require('./lib/queue');
var logger = require('./lib/logger').consumerLogger;

//========================================================================================================
// Errors
var RecoverableError = require('./lib/errors').RecoverableError;
var UnrecoverableError = require('./lib/errors').UnrecoverableError;
var DropSignal = require('./lib/errors').DropSignal;
var RequeueSignal = require('./lib/errors').RequeueSignal;

//========================================================================================================
const Consumer = require('sqs-consumer');
const app = Consumer.create({
    sqs: queue.sqsService,
    queueUrl: queue.url,
    visibilityTimeout: 720,
    waitTimeSeconds: 20,
    handleMessage: (message, done) => {

        if (!message || !message.Body) {
            logger.info('Consuming messages...');
            return done();
        }

        var gmailMessage = JSON.parse(message.Body);
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
            .then(core.createJiraEntity) // Handle Requeue
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

                if (err instanceof RecoverableError) {
                    logger.info('Got Recoverable Error:', err.message);
                    if (err.src) logger.info(err.src.message);
                    logger.warn(err);
                    queue.terminateMessageVisibilityTimeout(message.ReceiptHandle, (err2, data) => {
                        if (err2) {
                            logger.info('Got Recoverable Error:', err2.message);
                            logger.warn(err2);
                            return done(err2);
                        }

                        return done(err);
                    });
                }

                if (err instanceof UnrecoverableError) {
                    logger.info('Got Unrecoverable Error:', err.message);
                    if (err.src) logger.info(err.src.message);
                    logger.error(err);
                    return done(); // Remove the message and do manual recovery based on logs
                }

                if (err instanceof DropSignal) {
                    logger.info('Got Drop Signal:', err.message);
                    if (err.src) logger.info(err.src.message);
                    logger.warn(err);
                    return done();
                }

                if (err instanceof RequeueSignal) {
                    logger.info('Got Requeue Signal:', err.message);
                    if (err.src) logger.info(err.src.message);
                    logger.warn(err);

                    queue.sendMessage(JSON.stringify(gmailMessage), (err, data) => {

                        if (err) {
                            var uerr = new RecoverableError({
                                code: 'RE009',
                                message: 'SQS Failure: Failed to re-enqueue message',
                                src: err
                            });
                            logger.info('Got Recoverable Error:', uerr);
                            if (uerr.src) logger.info(uerr.src.message);
                            logger.warn(uerr);
                            return done(err);
                        }

                        return done();
                    });
                }
            })
            .catch((e) => logger.error('WTF:', e));
    }
});

//========================================================================================================
app.on('error', (err) => logger.error(err));
app.on('stopped', () => process.exit());

//========================================================================================================
logger.info('Consuming messages...');
app.start();

//========================================================================================================
process.once('SIGINT', () => {
    logger.info('\nStopping...');
    app.stop();
});
process.once('SIGUSR2', () => {
    logger.info('\nStopping...');
    app.stop();
});