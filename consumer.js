//========================================================================================================
var async = require('async');
var lodash = require('lodash');
var database = require('./database');
var core = require('./core');
var helpers = require('./helpers');
var queue = require('./queue');

//========================================================================================================
var RecoverableError = require('./errors').RecoverableError;
var UnrecoverableError = require('./errors').UnrecoverableError;
var InterceptSignal = require('./errors').InterceptSignal;

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
        console.log(`Processing message ${gmailMessage.id}`);


        database.connect()
            .then(() => Promise.resolve(gmailMessage))
            //-----------------------------------------------------------------
            .then(core.getDetailedMessage)
            .then(helpers.logStatus('Get message detail', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.formatMessage)
            .then(helpers.logStatus('Format message', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.checkMessage)
            .then(helpers.logStatus('Check message', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.assignMessageProject)
            .then(helpers.logStatus('Assign message project', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.removeMessageExtras)
            .then(helpers.logStatus('Remove message extras', 'Done'))
            //----------------------------------------------------------------- 
            .then(core.extractMessageMetadata)
            .then(helpers.logStatus('Extract message metadata', 'Done'))
            //-----------------------------------------------------------------            
            .then(core.registerMapping) // Handle Dup
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
                
                if (err instanceof RecoverableError)
                    return done(err); // Leave message at queue-front, retry a few times before pushed to dead-letter-queue
                
                if (err instanceof UnrecoverableError) {
                    // Do some sophisticated logging
                    require('fs').writeFileSync('error', err.toString()); // Not so sophisticated
                    return done(); // Remove the message and do manual recovery based on logs
                }

                if (err instanceof InterceptSignal) { // Look at errors/error-references.js for more details

                    if (err.code === 'IS003')
                        return done(); // Already processed, drop message
                    
                    if (err.code === 'IS004') {
                        // Re-enqueue
                        queue.sendMessage(JSON.stringify(gmailMessage), (err, data) => {
                            
                            if (err) {
                                console.log('Re-enqueue error:');
                                console.log(err);
                                return done(err);
                            }

                            return done();
                        });
                    }
                }
            });
    }
});

//========================================================================================================
app.on('error', (err) => {
    console.log(err.message);
});

//========================================================================================================
console.log('Consuming messages...');
app.start();