//========================================================================================================
var async = require('async');
var gmail = require('./gmail');
var queue = require('./queue');

//========================================================================================================
gmail.retrieveUnprocessedMessages((err, messages) => {
    if (err) return console.log(err);
    if (messages.length === 0)
        return console.log('Done, nothing to process');

    messages.reverse();
    console.log(`Begin processing ${messages.length} messages`);
    console.log('==================================================');
    // Perform iterating asynchronously
    async.eachSeries(
        // Data source
        messages,
        // Iterating function
        (message, next) => {

            console.log(`Processing message ${message.id}`);
            queue.sendMessage(JSON.stringify(message), (err, data) => {

                // Can't enqueue
                if (err) {
                    console.log(err);
                    next();
                    return;
                }

                console.log(`Message ${message.id} enqueued`);
                // Mark message enqueued
                gmail.markMessageEnqueued(message, (err) => {
                    
                    if (err) {
                        console.log(err);
                        next();
                        return;
                    }

                    console.log(`Message ${message.id} marked as enqueued`);
                    next();
                });
            });
        },
        // Final callback
        (err) => {
            if (err) return console.log(err);
            console.log('Done, finished processing');
        }
    );
});