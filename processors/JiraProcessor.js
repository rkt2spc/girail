//========================================================================================================
var JiraApi = require('jira-client');
var async = require('async');
var lodash = require('lodash');

//========================================================================================================
var database = require('../database');
var helpers = require('../helpers');
var gmailProcessor = require('./GMailProcessor');

//========================================================================================================
const DEFAULT_PROJECT = 'SAM';
const DEFAULT_ISSUE_TYPE = "Task";
const DEFAULT_REPORTER = "admin";

//========================================================================================================
// Constructor
var Jira = function () {
    this.JiraService = new JiraApi({
        protocol: 'https',
        host: 'nmtuan.atlassian.net',
        username: 'admin',
        password: '123456',
        apiVersion: '2',
        strictSSL: true
    });
};

//========================================================================================================
// Create Jira entities based on formatted messages
Jira.prototype.createEntities = function (messages, callback) {
    console.log("JiraProcessor:CreateEntities");
    var self = this;
    var JiraService = this.JiraService;

    //------------------------- 
    var promise = new Promise((fulfill, reject) => {

        if (!messages || messages.length === 0)
            return reject(new Error('No messages to get create Jira entities'));

        var issueMessages = messages.filter((m) => m.type === 'standard');
        var commentMessages = messages.filter((m) => m.type === 'reply');

        async.series([
            // Create Issues
            function (done) {
                self.createIssues(issueMessages, (err, mappedMessages) => {
                    if (err) return done(err);
                    done(null, mappedMessages);
                });
            },

            // Create comments
            function (done) {
                self.createComments(commentMessages, (err, mappedMessages) => {
                    if (err) return done(err);
                    done(null, mappedMessages);
                });
            }
        ], function (err, results) {
            if (err) return reject(err);
            var mappedMessages = lodash.flatten(results);
            fulfill(mappedMessages);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Create Issues
Jira.prototype.createIssues = function (issueMessages, callback) {
    console.log("JiraProcessor:CreateEntities:CreateIssues");
    var JiraService = this.JiraService;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        if (!issueMessages || issueMessages.length === 0)
            return fulfill([]);

        async.waterfall([
            // Create Issues
            function (next) {
                async.map(issueMessages, (message, cb) => {
                    JiraService.addNewIssue({
                        fields: {
                            project: { key: DEFAULT_PROJECT },
                            summary: message.subject,
                            description: message.content,
                            issuetype: {
                                name: DEFAULT_ISSUE_TYPE
                            },
                            reporter: {
                                name: DEFAULT_REPORTER
                            }
                        }
                    })
                        .then((issue) => {
                            message.issue = issue;
                            cb(null, message);
                        })
                        .catch((err) => cb(err));

                }, (err, messagesWithIssue) => {
                    if (err) return next(err);
                    next(null, messagesWithIssue);
                });
            },

            // Update mapping
            function (messagesWithIssue, next) {
                async.each(messagesWithIssue, (message, done) => {
                    database.updateMessageMapping(message, (err) => {
                        if (err) return done(err);
                        done(null);
                    });
                }, (err) => {
                    if (err) return next(err);
                    next(null, messagesWithIssue);
                });
            }
        ], (err, mappedMessages) => {
            if (err) return reject(err);
            fulfill(mappedMessages);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Create comments
Jira.prototype.createComments = function (commentMessages, callback) {
    console.log("JiraProcessor:CreateEntities:CreateComments");
    var JiraService = this.JiraService;

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        if (!commentMessages || commentMessages.length === 0)
            return fulfill([]);

        async.waterfall([
            // Find and map Issue to Comment Message
            function (next) {

                async.map(commentMessages, (message, cb) => {
                    database.getReplyMessageIssue(message, (err, issue) => {
                        if (err) return cb(err);
                        message.issue = issue;
                        cb(null, message);
                    });
                },
                    (err, messagesWithIssues) => {
                        if (err) return next(err);
                        next(null, messagesWithIssues);
                    });
            },

            // Create comments
            function (messagesWithIssue, next) {
                async.map(messagesWithIssue, (message, cb) => {
                    JiraService.addComment(message.issue.id, message.content)
                        .then((comment) => {
                            message.comment = comment;
                            cb(null, message);
                        })
                        .catch((err) => cb(err));
                }, (err, mappedMessages) => {
                    if (err) return next(err);
                    next(null, mappedMessages);
                });
            },

            // Update mapping
            function (messagesWithIssueAndComment, next) {
                async.each(messagesWithIssueAndComment, (message, done) => {
                    database.updateMessageMapping(message, (err) => {
                        if (err) return done(err);
                        done(null);
                    });
                }, (err) => {
                    if (err) return next(err);
                    next(null, messagesWithIssueAndComment);
                });
            }

        ], (err, mappedMessages) => {
            if (err) return reject(err);
            fulfill(mappedMessages);
        });
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
module.exports = Jira;