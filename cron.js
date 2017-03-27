//========================================================================================================
// External Depdendencies
var async = require('async');

//========================================================================================================
// Lib Depdendencies
var configsAdapter = require('./lib/configs-adapter');
var gmail = require('./lib/gmail');
var queue = require('./lib/queue');
var utils = require('./lib/utilities');

//========================================================================================================
// Configurations
var gmailSettings = configsAdapter.loadGmailSettings();
var mailboxSettings = configsAdapter.loadMailboxSettings();

//========================================================================================================
// Cron process
var mailboxes = gmail.generateMailboxes();
async.eachSeries(mailboxes,
    (mailbox, processNextMailbox) => {

        console.log("==============================================");
        console.log(`Processing mailbox <${mailbox.name}>`);
        mailbox.retrieveUnprocessedMessages((err, messages) => {
            if (err) return console.log(err);
            if (messages.length === 0)
                return console.log('Done, nothing to process');

            messages.reverse();
            console.log(`Begin processing ${messages.length} messages`);
            // Perform iterating asynchronously
            async.eachSeries(
                // Data source
                messages,
                // Iterating function
                (message, next) => {
                    console.log('--------------------------------------------------');
                    console.log(`Processing message ${message.id}`);
                    mailbox.getMessage(message.id, (err, detailedMessage) => {

                        if (err) {
                            console.log('Failed to get message detail!');
                            console.log(err);
                            next();
                            return;
                        }

                        queue.sendMessage(JSON.stringify(detailedMessage), (err, data) => {

                            // Can't enqueue
                            if (err) {
                                console.log('Failed to enqueue message!');
                                console.log(err);
                                next();
                                return;
                            }

                            console.log(`Message ${message.id} enqueued`);
                            // Mark message enqueued
                            mailbox.markMessageEnqueued(message, (err) => {

                                if (err) {
                                    console.log('Failed to mark message enqueued!');
                                    console.log(err);
                                    next();
                                    return;
                                }

                                console.log(`Message ${message.id} marked as enqueued`);
                                next();
                            });
                        });

                    });
                },
                // Final callback
                (err) => {
                    if (err) return console.log(err);
                    processNextMailbox();
                }
            );
        });
    },
    (err) => {
        if (err) return console.log(err.message);
        console.log('Done, finished processing');
    });
