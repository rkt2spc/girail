//========================================================================================================
var async = require('async');
var lodash = require('lodash');
var database = require('./database');
var core = require('./core');
var helpers = require('./helpers');

//========================================================================================================
var AppError = require('./errors/AppError');

//========================================================================================================
var AWS = require('aws-sdk');
var sqs = new AWS.SQS({
    region: 'eu-west-2',
    apiVersion: '2012-11-05'
});

//========================================================================================================
var Configs = require('./credentials/aws-conf.json');
//========================================================================================================

//========================================================================================================
const Consumer = require('sqs-consumer');
const app = Consumer.create({
    sqs: sqs,
    queueUrl: Configs.queue_url,
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
            .then(core.getDetailedMessage)
            .then(helpers.logStatus('Get message detail', 'Done'))
            .then(core.formatMessage)
            .then(helpers.logStatus('Format message', 'Done'))
            .then(core.checkMessage)
            .then(helpers.logStatus('Check message', 'Done'))
            .then(core.assignMessageProject)
            .then(helpers.logStatus('Assign message project', 'Done'))
            .then(core.registerMapping)
            .then(helpers.logStatus('Register mapping', 'Done'))
            .then(core.createJiraEntity) // Issue, Comment
            .then(helpers.logStatus('Create Jira entity', 'Done'))
            .then(core.updateMapping)
            .then(helpers.logStatus('Update mapping', 'Done'))
            .then(core.uploadAttachments)
            .then(helpers.logStatus('Upload attachments', 'Running in background'))
            .then(core.markMessageProcessed)
            .then(helpers.logStatus('Mark message processed', 'Done'))            
            .then(() => {
                console.log(`Finished processing message ${gmailMessage.id}`);
                done();
            })
            .catch((err) => {

                if (err instanceof AppError && err.code === '0') {
                    console.log(`Encounter out of order processing, reply message ${message.id} was received before any subject message`);
                    // re-enqueue message
                    sqs.sendMessage({
                        MessageBody: JSON.stringify(gmailMessage),
                        QueueUrl: Configs.queue_url
                    }, (err, data) => {

                        // Can't re-enqueue
                        if (err) {
                            console.log(err);
                            return done(err); // Should push logs to database or config dead-letter queue for manual recovery
                        }

                        done();
                        console.log(`Message ${gmailMessage.id} re-enqueued`);
                    });
                }
                else {
                    console.log(err.message);
                    done(err); // Should push logs to database or config dead-letter queue for manual recovery
                }

            });
    }
});

app.on('error', (err) => {
    console.log(err.message);
});

console.log('Consuming messages...');
app.start();