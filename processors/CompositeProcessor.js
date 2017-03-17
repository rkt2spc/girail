//========================================================================================================
var async = require('async');
var lodash = require('lodash');

//========================================================================================================
var database = require('../database');
var helpers = require('../helpers');

//========================================================================================================
// Constructor
var CompositeProcessor = function (gmailProcessor, jiraProcessor) {
    this.GMailService = gmailProcessor.GMailService;
    this.JiraService = jiraProcessor.JiraService;
};

//========================================================================================================
// Create new event record and return latest previous one
CompositeProcessor.prototype.forwardAttachments = function (messages, callback) {
    console.log("CompositeProcessor:ForwardAttachments");
    var gmailService = this.GMailService;
    var jiraService = this.JiraService;

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        async.each(messages, (m, done) => {
            if (m.attachments.length === 0) return done();

            async.each(m.attachments, (attachment, cb) => {
                gmailService.users.messages.attachments.get({
                    userId: 'me',
                    messageId: m.id,
                    id: attachment.id
                }, (err, response) => {

                    if (err) return cb(err);

                    var data = Buffer.from(response.data, 'base64');
                    console.log(`[Message ${m.id}][Attachment ${attachment.id}] Buffered`);

                    jiraService.addAttachmentOnIssue(m.issue.id, {
                        value: data,
                        options: {
                            filename: attachment.filename,
                            contentType: attachment.mimeType
                        }
                    })
                        .then((res) => {
                            console.log(`[Message ${m.id}][Attachment ${attachment.id}] Uploaded`);
                            cb();
                        })
                        .catch((err) => {
                            console.log(`[Message ${m.id}][Attachment ${attachment.id}] Upload Unsuccessful`);                            
                            cb(err);
                        });
                });
            }, (err) => {
                if (err) return done(err);
                done();
            });
        }, (err) => {
            if (err) return reject(err);
            fulfill();            
        });
    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
module.exports = CompositeProcessor;