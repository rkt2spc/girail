//========================================================================================================
// External Dependencies
var async = require('async');
var lodash = require('lodash');

//========================================================================================================
// Lib Dependencies
var helpers = require('./lib/utilities');
var database = require('./lib/database');
var core = require('./lib/core');
var queue = require('./lib/queue');

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
    visibilityTimeout: 1800,
    waitTimeSeconds: 20,
    handleMessage: (message, done) => {

        if (!message || !message.Body) {
            console.log('Consuming messages...');
            return done();
        }

        var gmailMessage = JSON.parse(message.Body);
        console.log('======================================================');
        console.log(`Processing message <${gmailMessage.mailbox}>: ${gmailMessage.id}`);

        database.connect()
            .then(() => Promise.resolve(lodash.cloneDeep(gmailMessage)))
            //-----------------------------------------------------------------            
            .then(core.assignMessageMailbox)
            .then(helpers.logStatus('Assign message mailbox', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.getMessageDetails)
            .then(helpers.logStatus('Get message details', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.formatMessage)
            .then(helpers.logStatus('Format message', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.checkMessage)
            .then(helpers.logStatus('Check message', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.categorizeMessage)
            .then(helpers.logStatus('Categorize message', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.assignMessageProject)
            .then(helpers.logStatus('Assign message project', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.removeMessageExtras)
            .then(helpers.logStatus('Remove message extras', 'Done'))
            //-----------------------------------------------------------------
            .then(core.createMessageHash)
            .then(helpers.logStatus('Create message hash', 'Done'))
            //-----------------------------------------------------------------
            .then(core.preventMessageReplication)
            .then(helpers.logStatus('Prevent message replication', 'Done'))
            //----------------------------------------------------------------- 
            .then(core.extractMessageMetadata)
            .then(helpers.logStatus('Extract message metadata', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.registerMapping)
            .then(helpers.logStatus('Register mapping', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.createJiraEntity) // Handle Requeue
            .then(helpers.logStatus('Create Jira entity', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.updateMapping)
            .then(helpers.logStatus('Update mapping', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.uploadAttachments)
            .then(helpers.logStatus('Upload attachments', 'Done'))
            //-----------------------------------------------------------------
            .then(core.markMessageProcessed)
            .then(helpers.logStatus('Mark message processed', 'Done'))
            //-----------------------------------------------------------------                   
            .then(() => {
                // No error happened
                console.log(`Finished processing message ${gmailMessage.id}`);
                done();
            })
            //-----------------------------------------------------------------            
            .catch((err) => {

                if (err instanceof RecoverableError) {
                    console.log('Got Recoverable Error:', err.message);
                    if (err.src)
                        console.log(err.src.message);
                    require('fs').writeFileSync('RecoverableError', err.toString()); // Not so sophisticated
                    return done(err); // Leave message at queue-front, retry a few times before pushed to dead-letter-queue
                }

                if (err instanceof UnrecoverableError) {
                    console.log('Got UnrecoverableError:', err.message);
                    if (err.src)
                        console.log(err.src.message);

                    // Do some sophisticated logging
                    require('fs').writeFileSync('UnrecoverableErro', err.toString()); // Not so sophisticated
                    return done(); // Remove the message and do manual recovery based on logs
                }

                if (err instanceof DropSignal) {
                    if (err.message) console.log(err.message);
                    return done();
                }

                if (err instanceof RequeueSignal) {

                    if (err.message) console.log(err.message);
                    queue.sendMessage(JSON.stringify(gmailMessage), (err, data) => {

                        if (err) {
                            // Do some sophisticated logging
                            console.log('SQS Failure: Failed to re-enqueue message');
                            console.log(err.message);
                            return done(err);
                        }

                        return done();
                    });
                }
            })
            .catch((e) => console.log('WTF:', e));
    }
});

//========================================================================================================
app.on('error', (err) => {
    console.log(err.message);
});
// app.on('stopped', () => process.exit());

//========================================================================================================
console.log('Consuming messages...');
app.start();

//========================================================================================================
// process.once('SIGINT', () => {
//     console.log('\nStopping...');
//     app.stop();
// });
// process.once('SIGUSR2', () => {
//     console.log('\nStopping...');
//     app.stop();
// });