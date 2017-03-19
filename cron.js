var gmail = require('./gmail');
var jira = require('./jira');
var core = require('./core');

exports.handle = function (event, callback) {

    database.connect()
        .then(() => Promise.resolve({ event: event }))
        // Step 1:
        .then(core.extractEventData)
        // STEP 2:
        .then(core.updateEventRecords)
        // STEP 3:
        .then(gmail.retrieveAddedMessages)
        // STEP 4:
        .then(core.formatMessages)
        // STEP 5:
        .then(core.filterMessages)
        // STEP 6:
        .then(core.deduplicateMessages)
        // STEP 7:
        .then(core.categorizeMessages)
        // STEP 8:
        .then(jira.createIssues)
        // STEP 9:
        .then(jira.createComments)
        // STEP 10:
        .then(jira.uploadAttachments)
        // STEP 11:
        
};